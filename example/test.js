const base = require( '../main' );

class Main extends base.HwAppBase
{
  constructor (){
    super();

    /** @type {import('./plugins/plugin1')} */
    this._rd = /**@type {any}*/( null );

    /** @type {NodeJS.Timeout | null} */
    this.timer = null;

    this.on( 'cfg_change', ( alias, content, dataId ) => {
      console.log( `--- alias: ${alias} dataId: ${dataId}, cfgChange: ` );
    } );
  }

  async onBeforeInit () {
    this.env.PROJ_PATH = this.env.PROJ_PATH + '/example';
    this.env.CFG_PATH = this.env.PROJ_PATH + '/config';

    this.cmdlineParser.option( '-p, --path [path...]', 'monitor path' );
    console.log( '--- onBeforeInit' ); 
  }

  async onCfgLoad () {
    console.log( '--- onCfgLoad' );
    this.cmdOpts['ms_prefix'] = '/node';
  }

  async onAfterInit () {
    console.log( '--- onAfterInit opts', this.cmdOpts );
  }

  async getAppMetaInfo () {
    return {mm: 'testApp'};
  }

  async onBeforeStart (){
    this.logger.info( this.env.PROJ_PATH );

    this.timer = setInterval( async ()=>{
      this.stop();
    }, 5000 );
    console.log( '-- onBeforeStart' );
  }

  async onAfterStart (){
    console.log( '-- onAfterStart' );
    this._rd.getData();

    this._ms.registerMethod( 'get','/testReg', ( req, res )=>{
      res.send( {a:'testReg'} );
    } );
  }

  async onBeforeStop (){
    console.log( '--- onBeforeStop' );
    if( this.timer !== null ) {
      clearInterval( this.timer );
    }
  }

  async onAfterStop (){
    console.log( '--- onAfterStop' );
    process.exit( 0 );
  }

  async getAppExtInfo () {
    return {hh: 'this extInfo'};
  }

  /**
   * 
   * @param {import('express').Express} _eapp - express app instance
   */
  async onInitExpressMiddlewares ( _eapp ) {
    console.log( '--- onInitExpressMiddlewares' );
  }

}

( async ()=>{
  const main = new Main();
  await main.init();
  await main.start();
} )();

