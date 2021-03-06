import SequelizeStatic, {
  Sequelize,
  Options,
  Op,
  Model,
  ModelOptions,
  DataType,
  ModelAttributeColumnOptions,
  CreateOptions,
  Transaction,
} from 'sequelize';
import Debug from 'debug';
const debug = Debug('trpg:storage');
const debugSQL = Debug('trpg:storage:sql');
import { TRPGApplication } from 'trpg/core';

import { getLogger } from './logger';
const appLogger = getLogger('application');
import _set from 'lodash/set';
import _constant from 'lodash/constant';

export type ModelFn = (
  Sequelize: typeof SequelizeStatic,
  db: DBInstance
) => typeof TRPGModel;

export interface TRPGDbOptions {
  database: string;
  username: string;
  password: string;
  options: Options;
}

interface TRPGModelAttributes {
  [name: string]:
    | DataType
    | (ModelAttributeColumnOptions & {
        /**
         * alias of allowNull
         */
        required?: boolean;
      });
}
// 魔改一下db的类型，加入了一些自己的参数
export type DBInstance = Sequelize & {
  op?: typeof Op;
  transactionAsync?: any;
  define: (
    modelName: string,
    attributes: TRPGModelAttributes,
    options?: ModelOptions
  ) => typeof TRPGModel;
};

const defaultDbOptions: Options = {
  logging(sql) {
    debugSQL(sql);
  },
  timezone: '+08:00',
  define: {
    freezeTableName: true, // 默认sequelize会在数据库表名后自动加上s, 改为true使其不会进行自动添加
  },
};

export default class Storage {
  _app: TRPGApplication;
  db: DBInstance;
  _Sequelize = SequelizeStatic;
  Op = Op;
  models: typeof TRPGModel[] = [];

  constructor(dbconfig: TRPGDbOptions, app: TRPGApplication) {
    this.db = this.initDb(dbconfig);
    this._app = app;

    redefineDb(this.db);
  }

  // 初始化并返回一个db实例
  initDb(dbconfig: TRPGDbOptions): DBInstance {
    let db: Sequelize;
    if (typeof dbconfig === 'string') {
      db = new Sequelize(dbconfig);
    } else {
      let { database, username, password, options } = dbconfig;

      options = Object.assign({}, defaultDbOptions, options);
      db = new Sequelize(database, username, password, options);
    }

    return db as DBInstance;
  }

  test() {
    this.db
      .authenticate()
      .then(() => {
        console.log('连接测试成功.');
      })
      .catch((err) => {
        console.error('无法连接到数据库:', err);
      });
  }

  // 注册模型
  registerModel(modelFn: ModelFn): typeof TRPGModel {
    if (typeof modelFn != 'function') {
      throw new TypeError(
        `registerModel error: type of model must be Function not ${typeof modelFn}`
      );
    }

    debug('register model %o success!', modelFn);
    appLogger.info('register model %o success!', modelFn);
    const model = modelFn(this._Sequelize, this.db);
    model.getApplication = _constant(this._app); // 注入增加app对象获取的方法
    this.models.push(model);
    return model;
  }

  reset(force = false) {
    return this.db.sync({ force });
  }

  query(sql: string) {
    return this.db.query(sql);
  }

  /**
   * 创建事务
   * 必须要应用参数transaction, 否则不生效
   */
  async transaction<T>(
    name: string,
    callback: (transaction: Transaction) => PromiseLike<T>
  ): Promise<T> {
    try {
      debug('create transaction:', name);
      const ret: T = await this.db.transaction(callback);
      debug('transaction completed:', name);
      return ret;
    } catch (e) {
      debug('transaction error:', name);
      throw e;
    }
  }

  async close(): Promise<void> {
    try {
      await this.db.close();
    } catch (err) {
      console.error('close storage error:', err);
    }
  }
}

// 重定义orm db实例的部分行为
function redefineDb(db: DBInstance) {
  db.op = Op;
  db.transactionAsync = async (fn) => {
    // TODO: 需要实现一个自动传递transaction的事务方法
    if (fn) {
      return await fn();
    }

    return;
  };

  let originDefine = db.define;
  db.define = function(name, attributes, options) {
    // 增加required
    for (let field in attributes) {
      let attr = attributes[field];
      if (attr.required === true) {
        _set(attr, 'allowNull', false);
      }
    }

    // 增加类方法别名，使用闭包防止访问到不正确的对象
    let originModelCls = originDefine.call(db, name, attributes, options);
    originModelCls.oneAsync = (function(_) {
      return function(where) {
        return _.findOne({ where });
      };
    })(originModelCls);
    originModelCls.createAsync = originModelCls.create;
    originModelCls.getAsync = originModelCls.findByPk;
    originModelCls.prototype.saveAsync = originModelCls.prototype.save;
    originModelCls.prototype.removeAsync = originModelCls.prototype.destroy;

    // 增加methods
    if (options && options.methods) {
      for (let methodName in options.methods) {
        originModelCls.prototype[methodName] = options.methods[methodName];
      }
    }

    return originModelCls;
  };
}

/**
 * 用自定义的InitOption来代替原来的InitOptions.
 * 因为原始的InitOption没法给ModelOptions传model类型
 */
export interface TRPGModelInitOptions<M extends Model<any, any> = Model>
  extends ModelOptions<M> {
  tableName: string; // 必须设定tableName
  sequelize: Sequelize;
}
export abstract class TRPGModel extends Model {
  public static init<M extends TRPGModel = TRPGModel>(
    this: { new (): M } & typeof Model,
    attributes: TRPGModelAttributes,
    options: TRPGModelInitOptions<M>
  ) {
    // 增加required
    for (let field in attributes) {
      const attr = attributes[field] as any;
      if (attr.required === true) {
        _set(attr, 'allowNull', false);
      }
    }
    if (options && !options.modelName) {
      // modelName默认为tableName
      options.modelName = options.tableName;
    }

    Model.init.call(this, attributes, options);
  }

  // 方法别名 below
  public static createAsync<M extends TRPGModel>(
    this: { new (): M } & typeof TRPGModel,
    values?: object,
    options?: CreateOptions
  ) {
    return this.create(values, options);
  }

  /**
   * 获取应用app对象
   */
  public static getApplication(): TRPGApplication {
    throw new Error('Not inject application!');
  }
}
