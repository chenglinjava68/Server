import { TRPGApplication, ModelFn, Model, EventFunc } from 'trpg/core';
import Router from 'koa-router';
import Debug, { Debugger } from 'debug';

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

  get router() {
    if (!this._router) {
      this._router = new Router();
    }
    return this._router;
  }

  getPackageName(): string {
    return this.name;
  }

  protected regModel(modelFn: ModelFn) {
    const storage = this.storage;
    const model = storage.registerModel(modelFn);
    this._models.push(model);
  }

  protected regSocketEvent(name: string, event: EventFunc) {
    const app = this.app;
    const packageName = this.getPackageName().toLocaleLowerCase();
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
  regMethod(method: any) {}

  /**
   * 输出调试信息
   * @param formatter 调试信息的格式
   * @param args 调试信息的参数
   */
  debug(formatter: any, ...args: any[]) {
    this._debug(formatter, ...args);
  }
}
