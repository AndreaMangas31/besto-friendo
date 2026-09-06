from typing import Literal, Optional

from pydantic import BaseModel

from app.features.conversation.models import ConversationTurnResponse

CommandName = Literal[
    "enable_japanese_mode",
    "disable_japanese_mode",
    "set_practice_mode",
    "japanese_turn",
    "enable_conversation_mode",
    "disable_conversation_mode",
    "conversation_turn",
    "tv_power_on",
    "tv_power_off",
    "tv_volume_up",
    "tv_volume_down",
    "tv_mute",
    "tv_home",
    "tv_back",
    "tv_play_pause",
    "tv_open_youtube",
    "tv_open_netflix",
    "tv_search",
    "tv_hdmi",
    "ps5_power_on",
    "ps5_power_off",
    "heating_power_on",
    "heating_power_off",
    "heating_temp_up",
    "heating_temp_down",
    "heating_set_temp",
    "call_luna",
    "agent_turn",
    "unknown",
]
PracticeMode = Literal["conversar", "corregir", "ideas"]
CommandHelpGroup = Literal["tutor", "chat", "tv", "ps5", "heating"]
# japanese_turn / conversation_turn / unknown / call_luna no van en la ayuda.
CommandHelpId = Literal[
    "enable_japanese_mode",
    "disable_japanese_mode",
    "set_practice_mode",
    "enable_conversation_mode",
    "disable_conversation_mode",
    "tv_power_on",
    "tv_power_off",
    "tv_volume_up",
    "tv_volume_down",
    "tv_mute",
    "tv_home",
    "tv_back",
    "tv_play_pause",
    "tv_open_youtube",
    "tv_open_netflix",
    "tv_search",
    "tv_hdmi",
    "ps5_power_on",
    "ps5_power_off",
    "heating_power_on",
    "heating_power_off",
    "heating_temp_up",
    "heating_temp_down",
    "heating_set_temp",
]


class CommandHelpItem(BaseModel):
    id: CommandHelpId
    title: str
    example: str
    description: str
    group: CommandHelpGroup


class CommandCatalogResponse(BaseModel):
    items: list[CommandHelpItem]


class DispatchResponse(BaseModel):
    command: CommandName
    transcript: str
    turn: Optional[ConversationTurnResponse] = None
    practice_mode: Optional[PracticeMode] = None
    device_message: Optional[str] = None
    # None = no es comando de dispositivo. True/False = tele, PS5 o calefacción.
    ok: Optional[bool] = None
    # Conversación del agente router (o futuros agentes). No es el tutor japonés.
    agent_id: Optional[str] = None
    agent_message: Optional[str] = None
    # Frase clara para “Te oí”. El STT crudo se queda en transcript.
    understood: Optional[str] = None
