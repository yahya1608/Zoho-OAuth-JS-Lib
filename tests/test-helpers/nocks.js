const nock = require('nock');
const internalConfig = require('../../config/internal-config.json');

class Nocks{

    constructor(){
        this._nocksInternal = nock(internalConfig.US.base_domain);
    }

    getAccessToken(response){
        this._nocksInternal.post(internalConfig.token_path).query(true).reply(200, response);
    }

    
}

module.exports = Nocks;

