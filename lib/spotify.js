import { SpotifyWebApi } from '@spotify/web-api-ts-sdk';

const sdk = SpotifyWebApi.withClientCredentials("client-id", "secret", ["scope1", "scope2"]);

const items = await sdk.playlist("The Beatles", ["artist"]);

console.table(items.artists.items.map((item) => ({
    name: item.name,
    followers: item.followers.total,
    popularity: item.popularity,
})));

// getPlaylist method
const playlist = await sdk.getPlaylist("37i9dQZF1DXcBWIGoYBM5M");
console.log(playlist.name);

/* 
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,

})
 */