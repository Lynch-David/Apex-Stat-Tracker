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
        router.get("/stats/:username", this.getStatisticsPage)
    }

    getSearchForm = async (req: Request, res: Response) => {
        let messages = req.getSearchParams().get("error")

        await res.send({
            statusCode: StatusCode.OK,
            message: "Search page retrieved",
            payload: {
                error: messages,
                isLoggedIn: req.session.get("isLoggedIn")
            },
            template: "SearchFormView"
        });

    }
    findPlayerStatistics = async (req: Request, res: Response) => {
        let platform: Platform | null = null;
        let gameProfile: Profile | null = null;
        let playerStats: Stats | null = null;
    
        try {
            
            //check db for stats
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
            req.session.set("gameProfileId", gameProfile.props.id);
            req.session.set("gameProfileUsername", gameProfile.props.username);
            res.setCookie(req.session.cookie)
            playerStats = await Stats.read(this.sql, gameProfile.props.id);

            if (playerStats) {
                await res.send({
                    statusCode: StatusCode.OK,
                    message: "Player stats exist in the database",
                    redirect: `/stats/${req.body.username}`,
                });
            }
            else {
                let platformAPIName: string = this.GetPlatformAPIName(req, res);
                const response = await fetch('https://api.mozambiquehe.re/bridge?auth=e38777f38399c07353c55e53bcda5082&player=' + req.body.username + '&platform=' + platformAPIName);
                const stats = await response.json();
                if(stats.Error)
                {
                    await res.send({
                        statusCode: StatusCode.NotFound,
                        message: "Player not found in API",
                        redirect: `/search?error=player_not_found`,
                    });
                    
                } else {
                    let statsProps: StatsProps = {
                        playerLevel: stats.global.level ?? null,
                        playerKills: stats.total.kills?.value ?? null,
                        // playerDeaths: stats?.totals?.deaths?.value ?? null,
                        // killDeathRatio: ,
                        playerDamage: stats.total.damage?.value ?? null,
                        playerWins: stats.total.career_wins?.value ?? null,
                        playerRank: stats.global.rank?.rankName ?? null,
                        profileId: gameProfile.props.id
                    };
        
                    playerStats = await Stats.create(this.sql, statsProps)
                    await res.send({
                        statusCode: StatusCode.Created,
                        message: "Player stats added successfully!",
                        redirect: `/stats/${req.body.username}`,
                    });
                }
            }
        } 
        catch (error) 
        {
            await res.send({
                statusCode: StatusCode.BadRequest,
                message: "Error requesting information. The API might be down",
                redirect: `/search?error=try_again`,
            });
        }
    }
    getStatisticsPage = async (req: Request, res: Response) => {
        let gameProfileId: number = req.session.get("gameProfileId")

        try {
            let userStats: Stats | null = await Stats.read(this.sql, gameProfileId);

            if(!userStats) {
                await res.send({
                    statusCode: StatusCode.NotFound,
                    message: "Could not retrieve user stats.",
                    redirect: "/search?error=try_again"
                });
            }
            else {
                let userGameProfile: Profile | null = await Profile.read(this.sql, req.session.get("gameProfileUsername"))
                if (userGameProfile) {
                    if (userGameProfile.props.siteUserId) {
                        await res.send({
                            statusCode: StatusCode.OK,
                            message: "Stats page retrieved",
                            payload: {
                                name: userGameProfile.props.username,
                                level: userStats.props.playerLevel,
                                kills: userStats.props.playerKills,
                                damage: userStats.props.playerDamage,
                                wins: userStats.props.playerWins,
                                rank: userStats.props.playerRank,
                                isLinked: true
                            },
                            template: "StatsView"
                        });
                    }
                    else {
                        await res.send({
                            statusCode: StatusCode.OK,
                            message: "Stats page retrieved",
                            payload: {
                                name: userGameProfile.props.username,
                                level: userStats.props.playerLevel,
                                kills: userStats.props.playerKills,
                                damage: userStats.props.playerDamage,
                                wins: userStats.props.playerWins,
                                rank: userStats.props.playerRank,
                                isLinked: false
                            },
                            template: "StatsView"
                        });
                    }
                }
                else {
                    await res.send({
                        statusCode: StatusCode.InternalServerError,
                        message: "Search page retrieved with errors",
                        redirect: "/search?error=try_again"
                    });
                }
                
            }
            

        } catch (error) {
            await res.send({
                statusCode: StatusCode.BadRequest,
                message: "Error getting user stats.",
                redirect: "/search?error=try_again"
            });
        }
        
    }


    private GetPlatformAPIName(req: Request, res: Response): string {
        if (req.body["platform"] === "PSN") {
            return "PS4"
        }
        else if (req.body["platform"] === "XBOX") {
            return "X1"
        }
        else {
            return "PC"
        }
    }


}