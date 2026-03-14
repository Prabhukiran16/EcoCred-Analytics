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
