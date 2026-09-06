from pydantic import BaseModel


class BootStatus(BaseModel):
    gate: str = "ok"
    main_up: bool
