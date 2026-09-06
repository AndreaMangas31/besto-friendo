from typing import Optional

from pydantic import BaseModel


class HeatingActionResult(BaseModel):
    ok: bool
    message: str


class HeatingStatus(BaseModel):
    ok: bool
    message: str
    zone_name: str = ""
    mode: str = ""
    setpoint_c: Optional[float] = None
    current_c: Optional[float] = None
