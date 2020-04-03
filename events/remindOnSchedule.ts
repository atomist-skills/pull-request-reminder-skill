/*
 * Copyright © 2020 Atomist, Inc.
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

import { normalizeTimestamp } from "@atomist/sdm-pack-lifecycle/lib/lifecycle/util";
import {
    commitIcon,
    linkIssues,
    removeMarkers,
    repoAndlabelsAndAssigneesFooter,
} from "@atomist/sdm-pack-lifecycle/lib/util/helpers";
import { EventHandler } from "@atomist/skill/lib/handler";
import { slackInfoMessage } from "@atomist/skill/lib/messages";
import {
    escape,
    githubToSlack,
    url,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import {
    OpenPullRequestQuery,
    OpenPullRequestQueryVariables,
    PullRequest,
    RemindOnScheduleSubscription,
} from "./types";

interface RemindConfiguration {
    users: string[];
}

export const handler: EventHandler<RemindOnScheduleSubscription, RemindConfiguration> = async ctx => {
    const users = ctx.configuration[0].parameters.users;

    if (!users || users.length === 0) {
        return {
            code: 0,
            visibility: "hidden",
            reason: `No users configured to be reminded`,
        };
    }

    const pullRequests: PullRequest[] = [];

    const size = 20;
    let offset = 1;
    let prs;
    do {
        prs = await ctx.graphql.query<OpenPullRequestQuery, OpenPullRequestQueryVariables>(
            "openPullRequests.graphql",
            {
                first: size,
                offset,
            });
        offset = offset + size;
        pullRequests.push(...(prs?.PullRequest || []));
    } while (!!prs && !!prs.PullRequest && prs.PullRequest.length > 0);

    if (pullRequests.length === 0) {
        await ctx.audit.log(`No pending pull requests reviews for users ${users.join(", ")}`);
        return {
            code: 0,
            reason: `No pending pull requests reviews for configured users`,
            visibility: "hidden",
        };
    } else {
        await ctx.audit.log(`${pullRequests.length} pending pull request ${pullRequests.length === 1 ? "review" : "reviews"} for users ${users.join(", ")}`);
        for (const pr of pullRequests) {
            await ctx.audit.log(` - ${pr.repo.owner}/${pr.repo.name}#${pr.number} ${pr.title}`);
        }
    }

    for (const user of users) {
        const userPullRequests = [];
        let chatId;
        pullRequests.forEach(pr => {
            if (pr.reviews.some(r => r.state === "requested" && r.by.some(b => b.login === user))) {
                userPullRequests.push(pr);
                const review = pr.reviews.find(r => r.by.some(b => b.login === user));
                chatId = review.by.find(b => b.login === user).person.chatId.screenName;
            }
        });
        if (userPullRequests.length > 0 && !!chatId) {
            const msg = slackInfoMessage(
                "Pending Pull Request Reviews",
                `The following pull ${userPullRequests.length === 1 ? "request is" : "requests are"} pending your review:`,
                ctx);
            msg.attachments[0].footer =
                `${msg.attachments[0].footer} \u00B7 ${url(
                    `https://preview.atomist.com/manage/${ctx.workspaceId}/skills/configure/${ctx.skill.id}/${encodeURIComponent(ctx.configuration[0].name)}`, "Configure")}`,
                _.orderBy(userPullRequests, ["createdAt"], ["desc"]).forEach(pr => {
                    msg.attachments.push({
                        color: "#37A745",
                        /* eslint-disable @typescript-eslint/camelcase */
                        author_icon: "https://images.atomist.com/rug/pull-request-open.png",
                        author_name: `#${pr.number} ${pr.title}`,
                        author_link: pr.url,
                        fallback: `#${pr.number} ${escape(pr.title)}`,
                        text: removeMarkers(linkIssues(githubToSlack(pr.body), pr.repo)),
                        mrkdwn_in: ["text"],
                        footer: repoAndlabelsAndAssigneesFooter(pr.repo, pr.labels, pr.assignees),
                        footer_icon: commitIcon(pr.repo),
                        ts: normalizeTimestamp(pr.createdAt),
                        /* eslint-enable @typescript-eslint/camelcase */
                    });
                });
            await ctx.audit.log(`Sending pull request notification to chat user @${chatId}`);
            await ctx.message.send(msg, { users: [chatId], channels: [] });
        }
    }

    return {
        code: 0,
        reason: `Sent open pull request reminders`,
    };
};
