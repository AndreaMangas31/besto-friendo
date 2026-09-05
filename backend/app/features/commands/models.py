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
    "unknown",
]
PracticeMode = Literal["conversar", "corregir", "ideas"]


class DispatchResponse(BaseModel):
    command: CommandName
    transcript: str
    turn: Optional[ConversationTurnResponse] = None
    practice_mode: Optional[PracticeMode] = None
    device_message: Optional[str] = None
