from typing import Literal, Optional

from pydantic import BaseModel

# Ampliar este Literal al activar un agente (web, japanese, discord, …).
AgentId = Literal["chat"]
AgentStatus = Literal["active", "planned"]
PracticeModeName = Literal["conversar", "corregir", "ideas"]


class CatalogSkill(BaseModel):
    """Un comando capado. El agente lo nombra; FastAPI lo ejecuta."""

    id: str
    title: str
    example: str
    description: str
    group: str


class AgentSpec(BaseModel):
    id: str
    description: str
    status: AgentStatus


class RouterIntent(BaseModel):
    # XOR: command capado vs agente. Si hay command, se ignora agent_id/reply.
    command: Optional[str] = None
    agent_id: Optional[str] = None
    practice_mode: Optional[PracticeModeName] = None
    query: Optional[str] = None
    hdmi: Optional[int] = None
    celsius: Optional[int] = None
    reply: Optional[str] = None


class ChatTurn(BaseModel):
    """Modo conversación: prosa + audio TTS del servidor. No es el tutor japonés."""

    user_text: str
    assistant_text: str
    speak: str
    audio_mime: Optional[str] = None
    audio_base64: Optional[str] = None
