import click
from kadroon.setup import after_install as setup


def after_install():
	try:
		print("Setting up Innomate Kadroon...")
		setup()

		click.secho("Thank you for installing Innomate Kadroon!", fg="green")

	except Exception as e:
		BUG_REPORT_URL = "https://github.com/kimoamer/kadroon/issues/new"
		click.secho(
			"Installation for Innomate Kadroon app failed due to an error."
			" Please try re-installing the app or"
			f" report the issue on {BUG_REPORT_URL} if not resolved.",
			fg="bright_red",
		)
		raise e