import { CommandHandler } from "@atomist/skill";

export const handler: CommandHandler = async ctx =>
	ctx.message.respond(`${new Date().getUTCHours()} hours`);
