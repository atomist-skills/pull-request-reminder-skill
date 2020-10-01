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

import {
	Category,
	parameter,
	ParameterType,
	ParameterVisibility,
	resourceProvider,
	skill,
} from "@atomist/skill";
import { RemindConfiguration } from "./lib/configuration";

export const Skill = skill<RemindConfiguration & { schedule: any; repos: any }>(
	{
		name: "pull-request-reminder-skill",
		namespace: "atomist",
		displayName: "Pull Request Review Reminder",
		author: "Atomist",
		categories: [Category.ProjectManagement, Category.CodeReview],
		license: "Apache-2.0",

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
				displayName: "Ignore reviewers",
				description:
					"List reviewers who should not get reminded (can be chat user names or GitHub logins)",
				required: false,
			},
			schedule: {
				type: ParameterType.Schedule,
				displayName: "Process pull request reviews",
				defaultValue: "0 * * * *",
				description: "Cron expression to process pull request reviews",
				required: false,
				visibility: ParameterVisibility.Hidden,
			},
			repos: parameter.repoFilter(),
		},
	},
);
