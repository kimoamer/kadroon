import click
from kadroon.setup import before_uninstall as remove

	
def before_uninstall():
	try:
		print("Removing Innomate Kadroon...")
		remove()

		click.secho("GoodBye, Hope you find your target!", fg="bright_red")

	except Exception as e:
		BUG_REPORT_URL = "https://github.com/kimoamer/kadroon/issues/new"
		click.secho(
			"Removing Innomate Kadroon app failed due to an error."
			" Please try re-uninstalling the app or"
			f" report the issue on {BUG_REPORT_URL} if not resolved.",
			fg="bright_red",
		)
		raise e