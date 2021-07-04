const internalConfig = require('./../config/internal-config.json');
const _ = require('lodash');
const Axios = require('axios').default
const qs = require('qs')


class OAuthConnector{
    constructor(configJson, dc){
        this.clientId = configJson.client_id;
        this.clientSecret = configJson.client_secret;
        this.redirectUri = configJson.redirect_uri;
        this.scopes = configJson.scopes;
        this.dc = dc;
        this.dcConfig = _.get(internalConfig, this.dc);
        this.response_type = 'code';
        this.axios = Axios;
        this._setUpAxios();
    }

    _setUpAxios(){
        this.axios.defaults.baseURL = this.dcConfig.base_domain;
    }

    _getScopesAsString(){
        return _.join(this.scopes)
    }

    getAuthorizationUrl(accessType=Enum.AccessType.Online, promptUser=false, state) {
        let url = this.dcConfig.base_domain + internalConfig.auth_path+'?'
                    + `response_type=${encodeURIComponent(this.response_type)}&client_id=${encodeURIComponent(this.clientId)}&redirect_uri=${encodeURIComponent(this.redirectUri)}`
                    + `&scope=${encodeURIComponent(this._getScopesAsString())}&accessType=${encodeURIComponent(accessType)}`;
        if(promptUser) {
            url = url + "&prompt=consent"
        }
        if(state){
            url = url + `&state=${state}`;
        }
        return url;
    }

    getAccessTokenUrl(code, state){
        let url = this.dcConfig.base_domain + internalConfig.token_path+'?'
                    + `code=${encodeURIComponent(code)}&client_id=${encodeURIComponent(this.clientId)}&client_secret=${encodeURIComponent(this.clientSecret)}`
                    + `&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${encodeURIComponent(this._getScopesAsString())}&`
                    + `state=${encodeURIComponent(state)}&grant_type=authorization_code`
        return url;
    }

    getAccessTokenFromRefreshTokenUrl(refreshToken){
        let url = this.dcConfig.base_domain + internalConfig.token_path+'?'
                    + `refresh_token=${encodeURIComponent(refreshToken)}&client_id=${encodeURIComponent(this.clientId)}&client_secret=${encodeURIComponent(this.clientSecret)}`
                    + `&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${encodeURIComponent(this._getScopesAsString())}&`
                    + `grant_type=refresh_token`
        return url;
    }

    async getAccessTokenAndRefreshToken(code, state){
        try{
            let url = this.getAccessTokenUrl(code, state);
            let tokenResponse = (await this.axios.post(url)).data;
            return tokenResponse;
        }catch(err){
            console.log(`Error while generating token`, err);
            throw err;
        }
    }

    async getAccessTokenFromRefreshToken(refreshToken){
        try{
            let url = this.getAccessTokenFromRefreshTokenUrl(refreshToken);
            let tokenResponse = (await this.axios.post(url)).data;
            return tokenResponse;
        }catch(err){
            console.log(`Error while generating token`, err);
            throw err;
        }
    }

    async getValidAccessToken(tokenInfo){
        let accessToken = tokenInfo.access_token;
        let expiryTime = tokenInfo.expires_in;
        let currTime = new Date().getTime().toString();
        if(currTime < expiryTime){
            return tokenInfo;
        }
        return await this.getAccessTokenFromRefreshToken(tokenInfo.refresh_token);
    }

    getCodeFromRedirectedUrl(redirectedUrl){
        if(redirectedUrl.indexOf('?') !== -1){
            redirectedUrl = redirectedUrl.split('?')[1];
        }
        if(redirectedUrl.indexOf('code=') !== -1){
            redirectedUrl = qs.parse(redirectedUrl).code;
        }
        return redirectedUrl;
        
    }
}

module.exports = OAuthConnector;