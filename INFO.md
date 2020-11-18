Every developer has experienced this: you raise a pull request and assign a
co-worker to review your work. That review takes hours or even days to come in.
You start to wonder if your request for review was even noticed or went straight
to spam.

This skill will periodically remind your colleagues about pending reviews in
Slack or Microsoft Teams so that you can be sure that they see your review
request.

This skill queries for pull requests with pending reviews and sends out direct
messages to reviewers in Slack or Microsoft Teams.

Reminders are sent twice per day at 9 a.m. and 3 p.m. in the reviewer's
configured local time zone.

For reminders to work correctly, users have to connect their chat identity to
their GitHub login. This is best achieved by running `@atomist authorize github`
in chat.
