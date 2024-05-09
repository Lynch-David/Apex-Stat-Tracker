import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import { createUTCDate } from "../utils";
import Stats, { StatsProps } from "../models/Stats";
import Profile, { ProfileProps } from "../models/GameProfile";
import { Platform, PlatformProps } from "../models/Platform";

/**
 * Controller for handling Todo CRUD operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class SearchController {
    private sql: postgres.Sql<any>;

    constructor(sql: postgres.Sql<any>) {
        this.sql = sql;
    }

    /**
     * To register a route, call the corresponding method on
     * the router instance based on the HTTP method of the route.
     *
     * @param router Router instance to register routes on.
     *
     * @example router.get("/todos", this.getTodoList);
     */
    registerRoutes(router: Router) {
        router.get("/search", this.getSearchForm);
        router.post("/search", this.findPlayerStatistics);
        router.get("/stats:username", this.getStatisticsPage)
    }

    getSearchForm = async (req: Request, res: Response) => {
        let messages = req.getSearchParams().get("error")

        await res.send({
            statusCode: StatusCode.OK,
            message: "Search page retrieved",
            payload: {
                error: messages,
            },
            template: "HomeView"
        });

    }
    findPlayerStatistics = async (req: Request, res: Response) => {
        let platform: Platform | null = null;
        let gameProfile: Profile | null = null;
        let playerStats: Stats | null = null;

        try {
            const response = await fetch('GET https://api.mozambiquehe.re/bridge?auth=e38777f38399c07353c55e53bcda5082&player=' + req.body.username + '&platform=' + req.body.platform);
            const stats = await response.json();

            platform = await Platform.read(this.sql, req.body.platform)
            gameProfile = await Profile.read(this.sql, req.body.username)

            if (!gameProfile) 
            {
                let profileStats: ProfileProps = {
	                username: req.body.username,
	                platformId: platform?.props.id
                };

                gameProfile = await Profile.create(this.sql, profileStats)
            }
            
            playerStats = await Stats.read(this.sql, gameProfile.props.id);

            if (playerStats) {
                await res.send({
                    statusCode: StatusCode.BadRequest,
                    message: "Player stats already exist in the database",
                    redirect: `/search?username=${req.body.username}`,
                });
                return;
            }

            let statsProps: StatsProps = {
                id: stats.global.uid,
                playerLevel: stats.global.level,
                playerKills: stats.totals.career_kills.value,
                // playerDeaths: stats.totals.deaths,
                // killDeathRatio: ,
                playerDamage: stats.totals.damage.value,
                playerWins: stats.totals.career_wins.value,
                playerRank: stats.global.rankName,
                profileId: gameProfile.props.id
            };

            playerStats = await Stats.create(this.sql, statsProps)
            await res.send({
                statusCode: StatusCode.Created,
                message: "Player stats added successfully!",
                redirect: `/search?username=Davydav`,
            });

        } 
        catch (error) 
        {
            await res.send({
                statusCode: StatusCode.BadRequest,
                message: "Error requesting information. Try again later",
                redirect: `/search`,
            });
            return
        }
    }
    getStatisticsPage = async (req: Request, res: Response) => {
        throw new Error("Method not implemented.");
    }


}