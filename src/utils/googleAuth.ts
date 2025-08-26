import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID as string,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  redirectUri: process.env.GOOGLE_REDIRECT_URL as string , 
});

export default client;