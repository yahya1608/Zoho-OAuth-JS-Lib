const Nocks = require("./test-helpers/nocks");
const test = require('ava');
const OAuthConnector = require('../lib/oauth-connector');
const Enum = require('../lib/enum')

test.before(async t => {
	t.context.nocks = new Nocks();
    t.context.configJson = {
        client_id : 'test-client-id',
        client_secret : 'test-client-secret',
        scopes : ['scope1', 'scope2'],
        redirect_uri : 'http://localhost/sample-redirect'
    }
    t.context.dc = Enum.DC.US;
    t.context.oAuthConnector = new OAuthConnector(t.context.configJson, t.context.dc);
});

test('getAuthorizationUrl', async t => {
    const oAuthConnector = t.context.oAuthConnector;
    let url = oAuthConnector.getAuthorizationUrl(Enum.AccessType.Offline, true, '123');
    t.deepEqual(url, 'https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=test-client-id&redirect_uri=http%3A%2F%2Flocalhost%2Fsample-redirect&scope=scope1%2Cscope2&accessType=offline&prompt=consent&state=123')
});


test.serial('getAccessTokenAndRefreshToken', async t => {
    const oAuthConnector = t.context.oAuthConnector;

    const expectedResponse = {
        expires_in : new Date().getTime().toString(),
        token_type : 'bearer',
        access_token : 'access-token-1',
        refresh_token : 'refresh-token-1'
    };

    const nocks = t.context.nocks;
    nocks.getAccessToken(expectedResponse);

    let response = await oAuthConnector.getAccessTokenAndRefreshToken('code-1-1-1', '123');
    t.deepEqual(response, expectedResponse);
});

test.serial('getAccessTokenFromRefreshToken', async t => {
    const oAuthConnector = t.context.oAuthConnector;
    const refreshToken = 'refresh-token-2'
    const expectedResponse = {
        expires_in : new Date().getTime().toString(),
        token_type : 'bearer',
        access_token : 'access-token-1',
        refresh_token : refreshToken
    };

    const nocks = t.context.nocks;
    nocks.getAccessToken(expectedResponse);

    let response = await oAuthConnector.getAccessTokenFromRefreshToken(refreshToken);
    t.deepEqual(response, expectedResponse);
});

test.serial('getValidAccessToken -> Valid time', async t => {
    const oAuthConnector = t.context.oAuthConnector;
    const accessToken = 'access-token-5'
    const tokenInfo = {
        expires_in : (new Date().getTime() + 1000000).toString(),
        token_type : 'bearer',
        access_token : accessToken,
        refresh_token : 'refreshToken-1'
    };

    let response = await oAuthConnector.getValidTokenInfo(tokenInfo);
    t.deepEqual(response.tokenInfo, tokenInfo);
    t.deepEqual(response.isValid, true);
});

test.serial('getValidAccessToken -> Expired time', async t => {
    const oAuthConnector = t.context.oAuthConnector;
    const accessToken = 'access-token-5'
    const tokenInfo = {
        expires_in : (new Date().getTime() - 1000000).toString(),
        token_type : 'bearer',
        access_token : accessToken,
        refresh_token : 'refreshToken-1'
    };

    const expectedResponse = {
        expires_in : new Date().getTime().toString(),
        token_type : 'bearer',
        access_token : 'access-token-10',
        refresh_token : 'refreshToken-10'
    };
    const nocks = t.context.nocks;
    nocks.getAccessToken(expectedResponse);


    let response = await oAuthConnector.getValidTokenInfo(tokenInfo);
    t.deepEqual(response.tokenInfo, expectedResponse);
    t.deepEqual(response.isValid, false);
});

test('getCodeFromRedirectedUrl -> Simple string', async t => {
    const oAuthConnector = t.context.oAuthConnector;
    let code = oAuthConnector.getCodeFromRedirectedUrl('test');
    t.deepEqual(code, 'test');
});

test('getCodeFromRedirectedUrl -> Multiple query string', async t => {
    const oAuthConnector = t.context.oAuthConnector;
    let code = oAuthConnector.getCodeFromRedirectedUrl('test=jshs&code=1234');
    t.deepEqual(code, '1234');
});

test('getCodeFromRedirectedUrl -> Multiple query string with url', async t => {
    const oAuthConnector = t.context.oAuthConnector;
    let code = oAuthConnector.getCodeFromRedirectedUrl('https://localhost/redirect?code=1234&test=jshs');
    t.deepEqual(code, '1234');
});






