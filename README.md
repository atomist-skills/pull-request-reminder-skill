# `atomist/pull-request-reminder-skill`

<!---atomist-skill-description:start--->

Receive reminders about open pull requests that are waiting for your review

<!---atomist-skill-description:end--->

---

<!---atomist-skill-readme:start--->

# What it's useful for

Every developer has experienced this: you raise a pull request and assign a
co-worker to review your work. That review takes hours or even days to come in.
You start to wonder if your request for review was even noticed or went straight
to spam.

This skill will periodically remind your fellow colleagues about pending reviews
in Slack or Microsoft Teams so that you can be sure that they see your review
request.

# How it works

This skill queries for pull requests with pending reviews and sends out direct
messages to reviewers in Slack or Microsoft Teams.

Reminders are being sent twice per day at 9am and 3pm in local time zones.

For reminders to work correctly, users have to connect their chat identity to
their GitHub login. This is best achieved by running `@atomist authorize github`
in chat.

<!---atomist-skill-readme:end--->

Created by [Atomist][atomist]. Need Help? [Join our Slack workspace][slack].

[atomist]: https://atomist.com/ "Atomist - How Teams Deliver Software"
[slack]: https://join.atomist.com/ "Atomist Community Slack"
