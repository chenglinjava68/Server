import { buildAppContext } from 'test/utils/app';
import Application from 'packages/Core/lib/application';

const context = buildAppContext();

describe('app context', () => {
  test('context should contains app', () => {
    expect(context).toHaveProperty('app');
    expect(typeof context.app).toBe('object');
    expect(context.app instanceof Application).toBe(true);
  });

  test('context should contains port', () => {
    expect(context).toHaveProperty('port');
    expect(typeof context.port).toBe('number');
  });

  test('context should contains socket and emitEvent', () => {
    expect(context).toHaveProperty('socket');
    expect(typeof context.socket).toBe('object');
    expect(context.socket.connected).toBe(true);
    expect(context).toHaveProperty('emitEvent');
    expect(typeof context.emitEvent).toBe('function');
  });

  test('context.emitEvent should be ok', async () => {
    const ret = await context.emitEvent('hello');
    expect(ret).toMatchObject({
      data: null,
    });
    expect(ret).toHaveProperty('version');
    expect(typeof ret.version).toBe('string');
  });

  test('context should contains request', () => {
    expect(context).toHaveProperty('request');
    expect(typeof context.request).toBe('object');
    expect(context.request).toHaveProperty('get');
    expect(context.request).toHaveProperty('post');
  });

  test('context.request should be ok', async () => {
    const { status, body } = await context.request.get('/core/health');
    expect(status).toBe(200);
    expect(body).toMatchObject({
      env: 'test',
      result: true,
    });
    expect(body).toHaveProperty('version');
    expect(typeof body.version).toBe('string');
    expect(body).toHaveProperty('hash');
    expect(typeof body.hash).toBe('string');
  });
});