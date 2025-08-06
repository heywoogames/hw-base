'use strict';

class Plugin3
{
  /**
   * 
   * @param {import('../../types').HwAppBase} app - app instance
   */
  constructor ( app ) {
    this._main = app;
  }

  async getData (){
    console.log(  '--- plugin3 getData' );
  }

  async init ( ) {
    console.log( '---\t plugin3 init' );
  }


  async stop () {

    console.log( '---\t plugin3 stop' );
  }

  async start () {
    console.log( '---\t plugin3 start' );
  }

  async afterStartAll () {
    console.log( '---\t plugin3 start all' );
  }

}




module.exports = Plugin3;





