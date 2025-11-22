'use strict';

const DEF_NAME_KEY_NAME = 'name';
const DEF_ENABLE_KEY_NAME = 'enable';
const DEF_DEP_KEY_NAME = 'dependencies';
const DEF_OPTDEP_KEY_NAME = 'optionalDependencies';

class DepOrder
{
  constructor () {
    this.opt = {
      nameAlias: DEF_NAME_KEY_NAME,
      enableAlias:  DEF_ENABLE_KEY_NAME,
      depAlias: DEF_DEP_KEY_NAME, 
      optDepAlias: DEF_OPTDEP_KEY_NAME 
    };

  }

  #sequence ( tasks, names, results, missing, recursive, nest, optional, _parent ) {
    const opt = this.opt;

    names.forEach( ( name ) =>{
      if ( results.requires[name] ) return;
  
      const node = tasks[name];
  
      if ( !node ) {
        if ( optional === true ) return;
        missing.push( name );
      } else if ( nest.includes( name ) ) {
        nest.push( name );
        recursive.push( nest.slice( 0 ) );
        nest.pop( name );
      } else if ( node[opt.depAlias].length || node[opt.optDepAlias].length ) {
        nest.push( name );
        if ( node[opt.depAlias].length ) {
          this.#sequence( tasks, node[opt.depAlias], results, missing, recursive, nest, optional, name );
        }
        if ( node[opt.optDepAlias].length ) {
          this.#sequence( tasks, node[opt.optDepAlias], results, missing, recursive, nest, true, name );
        }
        nest.pop( name );
      }
      if ( !optional ) {
        results.requires[name] = true;
      }
      if ( !results.sequence.includes( name ) ) {
        results.sequence.push( name );
      }
    } );
  }

  #sequencify ( tasks, names ) {
    const results = {
      sequence: [],
      requires: {},
    }; // the final sequence
    const missing = []; // missing tasks
    const recursive = []; // recursive task dependencies
  
    this.#sequence( tasks, names, results, missing, recursive, [], false, 'app' );
  
    if ( missing.length || recursive.length ) {
      results.sequence = []; // results are incomplete at best, completely wrong at worst, remove them to avoid confusion
    }
  
    return {
      sequence: results.sequence.filter( item => results.requires[item] ),
      missingTasks: missing,
      recursiveDependencies: recursive,
    };
  }

  getOrderPlugins ( pluginsAll, optT ,logger ) {
    let opt = {
      nameAlias: optT?.nameAlias ?? DEF_NAME_KEY_NAME,
      enableAlias: optT?.enableAlias ?? DEF_ENABLE_KEY_NAME,
      depAlias: optT?.depAlias ?? DEF_DEP_KEY_NAME, 
      optDepAlias: optT?.optDepAlias ?? DEF_OPTDEP_KEY_NAME 
    };
    this.opt = opt;
  
    const enabledPluginNames = [];
    const allPlugins = {};
    for( let it in pluginsAll ){
      let info = pluginsAll[it];
      if( info[opt.enableAlias] === true ) {
        enabledPluginNames.push( it );
      }

      if( !info[opt.depAlias] ) {
        info[opt.depAlias] = [];
      }

      if( !( info[opt.depAlias] instanceof Array ) ) {
        throw new Error( `${opt.depAlias} must Array` );
      }

      if( !info[opt.optDepAlias] ) {
        info[opt.optDepAlias] = [];
      }

      if( !( info[opt.optDepAlias] instanceof Array ) ) {
        throw new Error( `--- [depOrder] ${opt.optDepAlias} must Array` );
      }

      info[opt.nameAlias] = it;
      allPlugins[it] = info;
    }
  
    // no plugins enabled
    if ( !enabledPluginNames.length ) {
      return [];
    }
  
    const result = this.#sequencify( allPlugins, enabledPluginNames );
    // catch error when result.sequence is empty
    if ( !result.sequence.length ) {
      const err = new Error( `sequencify plugins has problem, missing: [${result.missingTasks}], recursive: [${result.recursiveDependencies}]` );
      // find plugins which is required by the missing plugin
      for ( const missName of result.missingTasks ) {
        const requires = [];
        for ( const name in allPlugins ) {
          if ( allPlugins[name][opt.depAlias].includes( missName ) ) {
            requires.push( name );
          }
        }
        err.message += `\n\t>> Plugin [${missName}] is disabled or missed, but is required by [${requires}]`;
      }
  
      err.name = 'PluginSequencifyError';
      throw err;
    }
  
    // log the plugins that be enabled implicitly
    const implicitEnabledPlugins = [];
    const requireMap = {};
    result.sequence.forEach( name => {
      for ( const depName of allPlugins[name][opt.depAlias] ) {
        if ( !requireMap[depName] ) {
          requireMap[depName] = [];
        }
        requireMap[depName].push( name );
      }
  
      if ( !allPlugins[name][opt.enableAlias] ) {
        implicitEnabledPlugins.push( name );
        allPlugins[name][opt.enableAlias] = true;
      }
    } );
  
    // Following plugins will be enabled implicitly.
    if ( implicitEnabledPlugins.length ) {
      let message = implicitEnabledPlugins
        .map( name => `  - ${name} required by [${requireMap[name]}]` )
        .join( '\n' );
      if( logger ) {
        logger.info( `Following plugins will be enabled implicitly.\n${message}` );
      }
      // should warn when the plugin is disabled by app
      const disabledPlugins = implicitEnabledPlugins.filter( name => pluginsAll[name] && pluginsAll[name][opt.enableAlias] === false );
      if ( disabledPlugins.length ) {
        message = disabledPlugins
          .map( name => `  - ${name} required by [${requireMap[name]}]` )
          .join( '\n' );
  
        if( logger ) {
          logger.warn( `Following plugins will be enabled implicitly that is disabled by application.\n${message}` );
        }
      }
    }
  
    return result.sequence.map( name => allPlugins[name] );
  }

}

/** 根据依赖顺序对数组进行排序
 * 
 * @param {Record<string, object>} pluginsAll 插件对象
 * @param {{enableAlias:string,depAlias:string, DEF_DEP_KEY_NAME: string, optDepAlias:string, nameAlias: string}} optT - 可选参数
 *     - enableAlias enable字段昵称
 *     - depAlias 依赖字段昵称
 *     - optDepAlias 可选依赖字段昵称
 *     - nameAlias 插件名称字段，会新增
 * @param {any?} logger 日志
 * @returns {string[]} 插件名称数组
 */
function getDepOrder ( pluginsAll, optT ,logger ) {
  let dep = new DepOrder();
  return dep.getOrderPlugins( pluginsAll, optT ,logger );
}

module.exports = { getDepOrder };

