from twilio.rest import Client

from config import settings


def send_login_sms(phone_number: str, email: str) -> bool:
    if not phone_number:
        return False

    if not all([settings.twilio_account_sid, settings.twilio_auth_token, settings.twilio_from_number]):
        return False

    # SMS should never block authentication; failures simply disable SMS notice.
    try:
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            body=f"EcoCred login alert: {email} just signed in.",
            from_=settings.twilio_from_number,
            to=phone_number,
        )
        return True
    except Exception:
        return False


def send_risk_alert_sms(phone_number: str, message: str) -> bool:
    if not phone_number or not message:
        return False, "phone_number and message are required"

    if not all([settings.twilio_account_sid, settings.twilio_auth_token, settings.twilio_from_number]):
        return False, "twilio credentials are not configured"

    normalized = phone_number.strip().replace(" ", "")
    if normalized.startswith("0") and len(normalized) == 11:
        normalized = "+91" + normalized[1:]
    elif normalized.isdigit() and len(normalized) == 10:
        normalized = "+91" + normalized

    if not normalized.startswith("+"):
        return False, "phone number must be in E.164 format (example: +9198xxxxxx)"

    try:
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            body=message,
            from_=settings.twilio_from_number,
            to=normalized,
        )
        return True, f"sms sent to {normalized}"
    except Exception as exc:
        return False, str(exc)
