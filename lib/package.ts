import {
  TRPGApplication,
  ModelFn,
  Model,
  EventFunc,
  JobCallback,
} from 'trpg/core';
import Router from 'koa-router';
import Debug, { Debugger } from 'debug';

export interface PackageMethodsType {
  [methodName: string]: Function;
}

export default abstract class BasePackage {
  public abstract name: string; // 包名
  public abstract require: string[]; // 包依赖列表
  public abstract desc: string; // 包信息描述
  private _debug: Debugger;
  private _app: TRPGApplication;
  private _models: (typeof Model)[] = []; // 该包注册的数据库模型列表
  private _router: Router; // 该包独有的Router

  constructor(app: TRPGApplication) {
    this._app = app;

    this._debug = Debug(`trpg:package:${this.getPackageName()}`);
  }

  /**
   * 被加载时的回调
   */
  onLoad(): void {}

  /**
   * 被初始化的回调
   * 需要被实现
   * 必须是一个同步方法
   */
  abstract onInit(): void;

  get app() {
    return this._app;
  }

  get storage() {
    return this.app.storage;
  }

  get db() {
    return this.storage.db;
  }

  get router() {
    if (!this._router) {
      this._router = new Router();
    }
    return this._router;
  }

  /**
   * 获取app config配置
   * @param path 配置路径
   * @param defaultValue 默认值
   */
  getConfig(path: string, defaultValue?: string) {
    return this.app.get(path, defaultValue);
  }

  /**
   * 返回包名小写版本
   */
  getPackageName(): string {
    return (this.name || '').toLocaleLowerCase();
  }

  /**
   * 注册一个数据库ORM模型
   * @param modelDefinitionFn 数据库模型定义方法
   */
  protected regModel(modelDefinitionFn: ModelFn) {
    const storage = this.storage;
    const model = storage.registerModel(modelDefinitionFn);
    this._models.push(model);
  }

  protected regSocketEvent(name: string, event: EventFunc) {
    const app = this.app;
    const packageName = this.getPackageName();
    if (!name.startsWith(`${packageName}::`)) {
      // 事件名必须为: 包名::事件名
      name = `${packageName}::${name}`;
    }

    app.registerEvent(name, event);
  }

  protected regRoute(route: Router) {
    const scope = this.getPackageName().toLowerCase();
    this.router.use(`/${scope}`, route.routes());
  }

  protected regPackageData(name: string, defaultValue?: any) {
    const packageName = this.getPackageName();
    this.app[packageName] = Object.assign({}, this.app[packageName], {
      [name]: defaultValue,
    });
  }

  /**
   *
   * @param methods 方法列表对象
   */
  protected regMethods(methods: PackageMethodsType) {
    const packageName = this.getPackageName();
    this.app[packageName] = Object.assign({}, this.app[packageName], methods);
  }

  /**
   * 注册一个统计项，默认的每天凌晨2点会进行统计
   * @param name 统计项名
   * @param func 统计调用方法
   */
  protected regStatJob(name: string, func: () => Promise<number | string>) {
    this.app.registerStatJob(name, func);
  }

  /**
   * 注册计划任务
   * @param name 计划任务名
   * @param rule 计划任务执行规则
   * @param fn 计划任务方法
   */
  protected regScheduleJob(name: string, rule: string, fn: JobCallback) {
    this.app.registerScheduleJob(name, rule, fn);
  }

  /**
   * 初始化完毕后的回调
   */
  onInitCompleted() {
    const app = this.app;

    if (this._router) {
      // 如果使用过router 则将该router注册到web服务中
      const webservice = app.webservice;
      webservice.use(this._router.routes());
    }

    this.debug(
      'Init package %s completed! [Required: %s, Model: %d]',
      this.getPackageName(),
      this.require,
      this._models.length
    );
  }

  // TODO
  regValue(value: {}) {}

  /**
   * 输出调试信息
   * @param formatter 调试信息的格式
   * @param args 调试信息的参数
   */
  debug(formatter: any, ...args: any[]) {
    this._debug(formatter, ...args);
  }
}
