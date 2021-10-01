const internalConfig = require('./../config/internal-config.json');
const _ = require('lodash');
const Axios = require('axios').default
const qs = require('qs')
const moment = require('moment')


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
    /**
     *
     * @param {String} accessType 
     * @param {boolean} promptUser 
     * @param {String} state 
     * @returns {String}
     */

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
                    + `&redirect_uri=${encodeURIComponent(this.redirectUri)}&`
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

    _convertExpiresIn(tokenResponse){
        let expiresIn = _.get(tokenResponse, 'expires_in');
        if(_.isNumber(expiresIn))
        {
            expiresIn = expiresIn - 5;
            let expiresInDate = moment().add(expiresIn, 'second').toISOString();
            _.set(tokenResponse, 'expires_in', expiresInDate);
        }
    }

    /**
     * This method gives access token and refresh token from the auth code
     * @param {String} code 
     * @param {String} state 
     * @returns {JSON} token info
     */

    async getAccessTokenAndRefreshToken(code, state){
        try{
            let url = this.getAccessTokenUrl(code, state);
            let tokenResponse = (await this.axios.post(url)).data;
            this._convertExpiresIn(tokenResponse);
            return tokenResponse;
        }catch(err){
            console.log(`Error while generating token`, err);
            throw err;
        }
    }

    /**
     * 
     * @param {String} refreshToken 
     * @returns {JSON} token info
     */

    async getAccessTokenFromRefreshToken(refreshToken){
        try{
            let url = this.getAccessTokenFromRefreshTokenUrl(refreshToken);
            let tokenResponse = (await this.axios.post(url)).data;
            this._convertExpiresIn(tokenResponse);
            return tokenResponse;
        }catch(err){
            console.log(`Error while generating token`, err);
            throw err;
        }
    }
    /**
     * 
     * @param {JSON} tokenInfo 
     * @returns boolean isValid
     */

    isTokenInfoValid(tokenInfo){
        let accessToken = _.get(tokenInfo, 'access_token');
        if(_.isEmpty(accessToken)) return false;
        let expiresIn = _.get(tokenInfo, 'expires_in');
        if(_.isEmpty(expiresIn)) return false;
        return !moment().isAfter(expiresIn)
    }

    /**
     * 
     * @param {JSON} tokenInfo 
     * @returns {JSON} 
     */

    async getValidTokenInfo(tokenInfo){
        let isValid = this.isTokenInfoValid(tokenInfo);
        if(isValid){
            return { isValid : true, tokenInfo : tokenInfo};
        }
        tokenInfo = await this.getAccessTokenFromRefreshToken(tokenInfo.refresh_token);
        return { isValid : false, tokenInfo : tokenInfo};
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