from pydantic import BaseModel, Field


class GoalUpsert(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    target_amount_krw: float = Field(..., gt=0)


class GoalOut(BaseModel):
    id: int
    name: str
    target_amount_krw: float

    model_config = {"from_attributes": True}
