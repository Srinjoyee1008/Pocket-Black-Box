from __future__ import annotations

import os
from pathlib import Path
import re
from typing import Annotated
from uuid import UUID

from fastapi import FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.responses import HTMLResponse, JSONResponse

from app.classification import classify
from app.models import (
    CreateReport,
    ErrorResponse,
    ReportStatus,
    TriageRequest,
    TriageResponse,
    UpdateReport,
    Urgency,
)
from app.storage.repository import ReportRepository
from app.transcription import PackagedWhisperTranscriber, Transcriber

MAX_AUDIO_BYTES = 25 * 1024 * 1024


def create_app(
    repository: ReportRepository | None = None,
    transcriber: Transcriber | None = None,
) -> FastAPI:
    app = FastAPI(
        title="Pocket Black Box local processor",
        version="1.0.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.state.repository = repository or ReportRepository(
        os.environ.get(
            "PBB_DATABASE_PATH",
            str(Path(__file__).resolve().parents[1] / "data" / "pocket-black-box.sqlite3"),
        )
    )
    app.state.transcriber = transcriber or PackagedWhisperTranscriber()

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request, exc: RequestValidationError):
        issues = [
            {"location": list(error.get("loc", ())), "message": error.get("msg", "Invalid value"),
             "type": error.get("type", "validation_error")}
            for error in exc.errors()
        ]
        body = ErrorResponse(
            error={
                "code": "VALIDATION_ERROR",
                "message": "The request did not match the endpoint contract.",
                "details": issues,
            }
        )
        return JSONResponse(status_code=422, content=jsonable_encoder(body))

    @app.exception_handler(HTTPException)
    async def api_error(_request, exc: HTTPException):
        detail = exc.detail
        if isinstance(detail, dict) and "code" in detail:
            error = detail
        else:
            code = "NOT_FOUND" if exc.status_code == 404 else "REQUEST_REJECTED"
            error = {"code": code, "message": str(detail)}
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": error},
            headers=exc.headers,
        )

    @app.exception_handler(Exception)
    async def internal_error(_request, _exc: Exception):
        body = ErrorResponse(
            error={
                "code": "INTERNAL_ERROR",
                "message": "The local processor could not complete the request.",
            }
        )
        return JSONResponse(status_code=500, content=jsonable_encoder(body))

    @app.get("/api/health")
    async def health():
        database_ready = bool(app.state.repository.health())
        transcription = app.state.transcriber
        model_ready = bool(getattr(transcription, "available", False))
        return {
            "status": "healthy" if database_ready else "unhealthy",
            "services": {
                "database": "ready" if database_ready else "unavailable",
                "classifier": "ready",
                "transcription": "ready" if model_ready else "unavailable",
                "network": "loopback_only",
            },
        }

    @app.post("/api/reports", status_code=status.HTTP_201_CREATED)
    async def create_report(request: CreateReport):
        return {"report": app.state.repository.create(request)}

    @app.get("/api/reports")
    async def list_reports(
        urgency: Annotated[Urgency | None, Query()] = None,
        report_status: Annotated[ReportStatus | None, Query(alias="status")] = None,
    ):
        reports = app.state.repository.list(urgency=urgency, status=report_status)
        return {"reports": reports, "count": len(reports)}

    @app.get("/api/map", response_class=HTMLResponse)
    async def priority_map():
        import folium
        from branca.element import Element
        from html import escape

        reports = app.state.repository.list()
        located = [
            report for report in reports
            if report.location and report.location.latitude is not None
            and report.location.longitude is not None
        ]
        map_view = folium.Map(
            location=[22.5726, 88.3639],
            zoom_start=10,
            tiles=None,
            control_scale=True,
        )
        colors = {"high": "#A13B32", "medium": "#D58A16", "low": "#39724C"}
        for report in located:
            location = report.location
            popup = "<br>".join(escape(value) for value in (
                f"{report.urgency.upper()} · {report.status.replace('_', ' ')}",
                location.area or "Area not specified",
                report.text[:500],
            ))
            folium.CircleMarker(
                location=[location.latitude, location.longitude],
                radius=8,
                color=colors[report.urgency.value],
                fill=True,
                fill_opacity=0.8,
                popup=folium.Popup(popup, max_width=320),
            ).add_to(map_view)
        area_reports = [report for report in reports if report.location and report.location.area]
        area_items = "".join(
            f"<li><strong>{escape(report.urgency.value.upper())}</strong> "
            f"{escape(report.location.area or '')} — {escape(report.text[:180])}</li>"
            for report in area_reports
        )
        map_view.get_root().html.add_child(Element(
            "<section style='font:14px sans-serif;padding:12px'>"
            "<strong>Offline priority map</strong> · No basemap or tile requests. "
            f"{len(located)} coordinate reports, {len(area_reports)} area labels."
            f"<ul>{area_items or '<li>No area labels recorded.</li>'}</ul></section>"
        ))
        min_lat = min((report.location.latitude for report in located), default=22.5726)
        max_lat = max((report.location.latitude for report in located), default=22.5726)
        min_lon = min((report.location.longitude for report in located), default=88.3639)
        max_lon = max((report.location.longitude for report in located), default=88.3639)

        def plot_x(longitude: float) -> float:
            return 60 + (longitude - min_lon) / (max_lon - min_lon) * 680 if max_lon != min_lon else 400

        def plot_y(latitude: float) -> float:
            return 40 + (max_lat - latitude) / (max_lat - min_lat) * 340 if max_lat != min_lat else 210

        marker_svg = "".join(
            "<g>"
            f"<circle cx='{plot_x(report.location.longitude)}' cy='{plot_y(report.location.latitude)}' "
            f"r='10' fill='{colors[report.urgency.value]}'>"
            f"<title>{escape(report.urgency.value.upper())} · {escape(report.location.area or '')} · "
            f"{escape(report.text[:300])}</title></circle>"
            f"<text x='{plot_x(report.location.longitude)}' y='{plot_y(report.location.latitude) + 26}' "
            f"text-anchor='middle' font-size='12'>{escape(str(report.id)[:4].upper())}</text></g>"
            for report in located
        )
        empty_marker_svg = '<text x="400" y="220" text-anchor="middle">No coordinate reports yet</text>'
        svg = (
            "<svg role='img' aria-label='Offline relative coordinate map' viewBox='0 0 800 440' "
            "width='100%' style='height:auto;max-height:480px;background:#F6F9FA' "
            "xmlns='http://www.w3.org/2000/svg'>"
            "<path d='M60 210H740 M400 40V380' stroke='#D4DEE5' fill='none'/>"
            f"{marker_svg or empty_marker_svg}"
            "</svg>"
        )
        rendered = map_view.get_root().render()
        rendered = re.sub(r"<script\b[^>]*>[\s\S]*?</script\s*>", "", rendered, flags=re.IGNORECASE)
        rendered = re.sub(r"<link\b[^>]*>", "", rendered, flags=re.IGNORECASE)
        map_div = re.compile(
            rf'<div\s+class="folium-map"\s+id="{re.escape(map_view.get_name())}"\s*></div>'
        )
        rendered, replacements = map_div.subn(svg, rendered, count=1)
        if replacements != 1:
            raise RuntimeError("Folium did not render the expected map container.")
        return HTMLResponse(rendered)

    @app.get("/api/reports/{report_id}")
    async def get_report(report_id: UUID):
        report, events = app.state.repository.get(report_id)
        if report is None:
            raise HTTPException(
                status_code=404,
                detail={"code": "NOT_FOUND", "message": "Report was not found on this device."},
            )
        return {"report": report, "events": events}

    @app.patch("/api/reports/{report_id}")
    async def update_report(report_id: UUID, request: UpdateReport):
        report = app.state.repository.update(report_id, request)
        if report is None:
            raise HTTPException(
                status_code=404,
                detail={"code": "NOT_FOUND", "message": "Report was not found on this device."},
            )
        return {"report": report}

    @app.post("/api/transcribe")
    async def transcribe(audio: UploadFile = File(...)):
        if not audio.content_type or not audio.content_type.startswith("audio/"):
            raise HTTPException(
                status_code=422,
                detail={"code": "INVALID_AUDIO", "message": "Upload an audio/* file."},
            )
        contents = await audio.read(MAX_AUDIO_BYTES + 1)
        if len(contents) > MAX_AUDIO_BYTES:
            raise HTTPException(
                status_code=422,
                detail={"code": "AUDIO_TOO_LARGE", "message": "Audio must be 25 MiB or smaller."},
            )
        result = app.state.transcriber.transcribe(contents, audio.content_type)
        # Drop the in-memory reference as soon as inference returns; never write the clip.
        del contents
        if not result.available or result.transcript is None:
            raise HTTPException(
                status_code=503,
                detail={
                    "code": "TRANSCRIPTION_UNAVAILABLE",
                    "message": "Offline transcription is not configured on this device; enter report text manually.",
                    "modelStatus": result.model_status,
                },
            )
        return {"transcript": result.transcript, "modelStatus": result.model_status}

    @app.post("/api/triage", response_model=TriageResponse)
    async def triage(request: TriageRequest):
        result = classify(request.text)
        return {
            "suggestions": {"urgency": result.urgency, "needs": result.needs},
            "confidence": result.confidence,
            "modelStatus": result.model_status,
        }

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    # Deliberately bind only to device loopback; never use 0.0.0.0 here.
    uvicorn.run(create_app(), host="127.0.0.1", port=8765, log_level="info")
