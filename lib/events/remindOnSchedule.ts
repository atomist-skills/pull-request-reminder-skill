/*
 * Copyright © 2021 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EventHandler, log, slack, status } from "@atomist/skill";
import * as _ from "lodash";

import { RemindConfiguration } from "../configuration";
import { repoAndlabelsAndAssigneesFooter } from "../helpers";
import {
	OpenPullRequestQuery,
	OpenPullRequestQueryVariables,
	RemindOnScheduleSubscription,
} from "../typings/types";

export const handler: EventHandler<
	RemindOnScheduleSubscription,
	RemindConfiguration
> = async ctx => {
	const users = ctx.configuration?.parameters?.users || [];

	const pullRequests: Array<OpenPullRequestQuery["PullRequest"][0]> = [];

	const size = 20;
	let offset = 0;
	let prs;
	do {
		prs = await ctx.graphql.query<
			OpenPullRequestQuery,
			OpenPullRequestQueryVariables
		>("openPullRequests.graphql", {
			first: size,
			offset,
		});
		offset = offset + size;
		pullRequests.push(...(prs?.PullRequest || []));
	} while (!!prs && !!prs.PullRequest && prs.PullRequest.length > 0);

	if (pullRequests.length === 0) {
		log.info(`No pending pull requests reviews`);
		return status.success(`No pending pull requests reviews`).hidden();
	} else {
		log.info(
			`${pullRequests.length} pending pull request ${
				pullRequests.length === 1 ? "review" : "reviews"
			}`,
		);
		for (const pr of pullRequests) {
			log.info(
				` - ${pr.repo.owner}/${pr.repo.name}#${pr.number} ${pr.title}`,
			);
		}
	}

	const pullRequestsByUsers: Record<
		string,
		{ timezone: string; prs: Array<OpenPullRequestQuery["PullRequest"][0]> }
	> = {};
	pullRequests.forEach(pr => {
		pr.reviews
			.filter(r => r.state === "requested")
			.forEach(r => {
				r.by
					.filter(
						b =>
							!!b.person?.chatId?.screenName &&
							!users.includes(b.login) &&
							!users.includes(b.person.chatId.screenName),
					)
					.forEach(b => {
						const opr = pullRequestsByUsers[
							b.person.chatId.screenName
						] || {
							timezone: b.person.chatId.timezoneLabel,
							prs: [],
						};
						opr.prs.push(pr);
						pullRequestsByUsers[b.person.chatId.screenName] = opr;
					});
			});
	});

	const remindedUsers = [];
	const currentHour = new Date().getUTCHours();
	for (const user in pullRequestsByUsers) {
		const pullRequestsByUser = pullRequestsByUsers[user];
		const tz = await import("timezone-names");
		const offsetHours =
			tz.getTimezoneOffsetByName(pullRequestsByUser.timezone)?.Hours || 0;
		const triggerHours = currentHour + offsetHours;
		if (triggerHours === 9 || triggerHours === 15) {
			const msg: slack.SlackMessage = {
				text: "Pending Pull Request Reviews",
				blocks: [
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: `*Pending Pull Request Reviews*
Following${
								pullRequestsByUser.prs.length > 1
									? " " + pullRequestsByUser.prs.length
									: ""
							} ${
								pullRequestsByUser.prs.length === 1
									? "pull request"
									: "pull requests"
							} are waiting on your review:`,
						},
					} as slack.SectionBlock,
					{ type: "divider" } as slack.DividerBlock,
				],
			};

			_.orderBy(pullRequestsByUser.prs, ["createdAt"], ["desc"]).forEach(
				pr => {
					msg.blocks.push(
						{
							type: "section",
							text: {
								type: "mrkdwn",
								text: `*${slack.url(
									pr.url,
									`#${pr.number} ${slack.escape(pr.title)}`,
								)}*`,
							},
						} as slack.SectionBlock,
						{
							type: "context",
							elements: [
								{
									type: "image",
									image_url:
										"https://images.atomist.com/rug/pull-request-open.png",
									alt_text: "PR icon",
								},
								{
									type: "mrkdwn",
									text: repoAndlabelsAndAssigneesFooter(
										pr.repo,
										pr.author.login,
									),
								},
							],
						} as slack.ContextBlock,
					);
				},
			);

			msg.blocks.push(
				{ type: "divider" } as slack.DividerBlock,
				{
					type: "context",
					elements: [
						{
							type: "image",
							image_url:
								"https://images.atomist.com/logo/atomist-black-mark-xsmall.png",
							alt_text: "Atomist icon",
						},
						{
							type: "mrkdwn",
							text: `${ctx.skill.namespace}/${
								ctx.skill.name
							} \u00B7 ${slack.url(
								ctx.configuration?.url,
								"Configure",
							)}`,
						},
					],
				} as slack.ContextBlock,
			);

			await ctx.message.send(msg, { users: [user] });
			log.info(
				`Sent reminder about ${
					pullRequestsByUser.prs.length
				} pending pull request ${
					pullRequestsByUser.prs.length === 1 ? "review" : "reviews"
				} to user '${user}'`,
			);
			remindedUsers.push(user);
		}
	}
	if (remindedUsers.length > 0) {
		return status
			.success(
				`Sent pull request review reminders to ${
					remindedUsers.length
				} ${remindedUsers.length === 1 ? "user" : "users"}`,
			)
			.hidden();
	} else {
		return status.success(`No pull request review reminders sent`).hidden();
	}
};
