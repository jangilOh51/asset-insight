"""APScheduler 작업 등록."""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings
from app.scheduler.notification_check import run_notification_check
from app.scheduler.snapshot import save_daily_snapshot

scheduler = AsyncIOScheduler()


def setup_scheduler() -> None:
    cron_parts = settings.snapshot_cron.split()
    trigger = CronTrigger(
        minute=cron_parts[0],
        hour=cron_parts[1],
        day=cron_parts[2],
        month=cron_parts[3],
        day_of_week=cron_parts[4],
    )
    scheduler.add_job(save_daily_snapshot, trigger, id="daily_snapshot", replace_existing=True)

    scheduler.add_job(
        run_notification_check,
        IntervalTrigger(minutes=settings.notification_interval_minutes),
        id="notification_check",
        replace_existing=True,
    )
