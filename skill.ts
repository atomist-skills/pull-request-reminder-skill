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

import { Category, parameter, ParameterType, resourceProvider, skill } from "@atomist/skill";
import { RemindConfiguration } from "./lib/configuration";

export const Skill = skill<RemindConfiguration & { reminder: any; repos: any }>({
    name: "pull-request-reminder-skill",
    namespace: "atomist",
    displayName: "Pull Request Review Reminder",
    author: "Atomist",
    categories: [Category.DevEx],
    license: "Apache-2.0",
    homepageUrl: "https://github.com/atomist/pull-request-reminder-skill-skill",
    repositoryUrl: "https://github.com/atomist/pull-request-reminder-skill-skill.git",
    iconUrl: "file://docs/images/icon.svg",

    runtime: {
        memory: 512,
        timeout: 540,
    },

    resourceProviders: {
        github: resourceProvider.gitHub({ minRequired: 1 }),
        chat: resourceProvider.chat({ minRequired: 1 }),
    },

    parameters: {
        users: {
            type: ParameterType.StringArray,
            displayName: "GitHub logins",
            description: "GitHub logins of users who want to receive reminders",
            required: false,
        },
        reminder: {
            type: ParameterType.Schedule,
            displayName: "Cron expression",
            description: "Cron expression for when to send pull request reminders",
            required: true,
        },
        repos: parameter.repoFilter(),
    },

    subscriptions: ["file://graphql/subscription/*.graphql"],
});
