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

import { EventHandler } from "@atomist/skill/lib/handler";
import { slackInfoMessage } from "@atomist/skill/lib/messages";
import { url } from "@atomist/slack-messages";
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
            reason: `No users configured to remind`,
        };
    }

    const pullRequests: PullRequest[] = [];

    const size = 20;
    let offset = 1;
    let prs;
    do {
        prs = await ctx.graphql.query<OpenPullRequestQuery, OpenPullRequestQueryVariables>(
            "openPullRequest.graphql",
            {
                first: size,
                offset,
            });
        offset = offset + size;
        pullRequests.push(...(prs?.PullRequest || []));
    } while (!!prs && !!prs.PullRequest && prs.PullRequest.length > 0);

    for (const user of users) {
        const userPullRequests = [];
        let chatId;
        pullRequests.forEach(pr => {
            if (pr.reviews.some(r => r.by.some(b => b.login === user))) {
                userPullRequests.push(pr);
                const review = pr.reviews.find(r => r.by.some(b => b.login === user));
                chatId = review.by.find(b => b.login === user).person.chatId.screenName;
            }
        });
        if (userPullRequests.length > 0 && !!chatId) {
            const msg = slackInfoMessage(
                "Pending Pull Request Reviews",
                `Following pull ${userPullRequests.length === 1 ? "request is" : "requests are"} pending your review:`,
                ctx);
            userPullRequests.forEach(pr => {
                msg.attachments.push({
                    color: "#37A745",
                    author_icon: "https://images.atomist.com/rug/pull-request-open.png",
                    author_name: `#${pr.number} ${pr.title}`,
                    author_link: pr.url,
                    fallback: `#${pr.number} ${pr.title}`,
                    footer: url(pr.repo.url, `${pr.repo.owner}/${pr.repo.name}`),
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
