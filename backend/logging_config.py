import logging
import logging.config
import json
import datetime


class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_object = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }

        # Agregar campos extra si existen
        if hasattr(record, "extra_info"):
            log_object["extra"] = record.extra_info

        return json.dumps(log_object)


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,

    "formatters": {
        "json": {
            "()": JsonFormatter,
        },
    },

    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },

    "loggers": {
        "ambulance": {             # tu app principal
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {        # errores HTTP
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
