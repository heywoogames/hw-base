'use strict';

class Plugin2
{
  /**
   * 
   * @param {import('../../types').HwAppBase} app - app instance
   */
  constructor ( app ) {
    this._main = app;
  }

  async getData (){
    console.log(  '--- plugin2 getData' );
  }

  async init ( ) {
    console.log( '---\t plugin2 init' );
  }


  async stop () {

    console.log( '---\t plugin2 stop' );
  }

  async start () {
    console.log( '---\t plugin2 start' );
  }

  async afterStartAll () {
    console.log( '---\t plugin2 start all' );
  }

}




module.exports = Plugin2;





