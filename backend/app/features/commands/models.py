from typing import Literal, Optional

from pydantic import BaseModel

from app.features.conversation.models import ConversationTurnResponse

CommandName = Literal[
    "enable_japanese_mode",
    "disable_japanese_mode",
    "set_practice_mode",
    "japanese_turn",
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
    "ps5_power_on",
    "ps5_power_off",
    "unknown",
]
PracticeMode = Literal["conversar", "corregir", "ideas"]
CommandHelpGroup = Literal["tutor", "tv", "ps5"]
# japanese_turn / unknown no van en la ayuda: no son frases que el usuario “dispare”.
CommandHelpId = Literal[
    "enable_japanese_mode",
    "disable_japanese_mode",
    "set_practice_mode",
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
    "ps5_power_on",
    "ps5_power_off",
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
    # None = no es comando de dispositivo. True/False = tele o PS5 respondieron.
    ok: Optional[bool] = None
