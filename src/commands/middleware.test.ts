import { assert, describe, it } from 'vitest';

import { OperationalError } from '../errors.ts';
import C from '../factory.ts';
import { createTestContext, description, handler } from '../tests.ts';
import type { FlagValues, MiddlewareCommand } from './middleware.ts';
import { applyMiddleware } from './middleware.ts';
import { parseCommand } from './parsing.ts';

const context = createTestContext();

function middleware(
  id: string,
  options: Omit<MiddlewareCommand, 'id'> = { handler: async next => next() }
): MiddlewareCommand {
  return { ...options, id };
}

describe('applyMiddleware', () => {
  it('returns a handler immediately when given a command handler', async () => {
    let ran = false;

    const wrapped = applyMiddleware([
      middleware('logging', {
        handler: async next => {
          ran = true;
          return next();
        }
      })
    ], C(description, handler));

    assert.equal(wrapped.type, 'handler');

    const parsed = parseCommand(['command'], { command: wrapped }, context);
    assert(parsed.type === 'command', 'command not parsed');

    await parsed.run(context);
    assert.isTrue(ran);
  });

  it('merges middleware flags into a command', () => {
    const wrapped = applyMiddleware(
      [
        middleware('logging', {
          flags: { verbose: { description, type: 'boolean' } },
          handler: async next => next()
        })
      ],
      C(description, {
        message: { description, type: 'string' }
      }, handler)
    );

    assert.equal(wrapped.type, 'handler');

    assert.deepEqual(Object.keys(wrapped.flags || {}).sort(), [
      'message',
      'verbose'
    ]);
  });

  it('throws when a middleware flag conflicts with a command flag', () => {
    assert.throws(
      () =>
        applyMiddleware(
          [
            middleware('logging', {
              flags: { verbose: { description, type: 'boolean' } },
              handler: async next => next()
            })
          ],
          C.tree({
            echo: C(description, {
              verbose: { description, type: 'boolean' }
            }, handler)
          })
        ),
      'The --verbose flag from the logging middleware is already present on command: echo'
    );
  });

  it('throws when middleware flags conflict with each other', () => {
    assert.throws(
      () =>
        applyMiddleware(
          [
            middleware('logging', {
              flags: { verbose: { description, type: 'boolean' } },
              handler: async next => next()
            }),
            middleware('timing', {
              flags: { verbose: { description, type: 'boolean' } },
              handler: async next => next()
            })
          ],
          C.tree({
            deploy: C(description, handler)
          })
        ),
      /timing middleware is already present on command: deploy/
    );
  });

  it('applies middleware to handlers within a group', async () => {
    let ran = false;

    const group = applyMiddleware(
      [
        middleware('logging', {
          handler: async next => {
            ran = true;
            return next();
          }
        })
      ],
      C.group(description, {
        migrate: C(description, handler)
      })
    );

    assert.equal(group.type, 'group');

    const parsed = parseCommand(['migrate'], group.subcommands, context);
    assert(parsed.type === 'command', 'command not parsed');

    await parsed.run(context);
    assert.isTrue(ran);
  });

  it('recursively applies middleware to handlers in a tree', async () => {
    const order: string[] = [];

    const stack = [
      middleware('outer', {
        handler: async next => {
          order.push('outer');
          return next();
        }
      }),
      middleware('inner', {
        handler: async next => {
          order.push('inner');
          return next();
        }
      })
    ];

    const tree = applyMiddleware(
      stack,
      C.tree({
        deploy: C(description, async () => {
          order.push('deploy');
        }),
        db: C.group(description, {
          migrate: C(description, async () => {
            order.push('migrate');
          })
        })
      })
    );

    const deploy = parseCommand(['deploy'], tree, context);
    assert(deploy.type === 'command', 'deploy not parsed');
    await deploy.run(context);

    const migrate = parseCommand(['db', 'migrate'], tree, context);
    assert(migrate.type === 'command', 'migrate not parsed');
    await migrate.run(context);

    assert.deepEqual(order, [
      'outer',
      'inner',
      'deploy',
      'outer',
      'inner',
      'migrate'
    ]);
  });

  it('returns string output from the wrapped command handler', async () => {
    const tree = applyMiddleware(
      [
        middleware('logging', {
          handler: async next => next()
        })
      ],
      C.tree({
        echo: C(description, async () => '@output')
      })
    );

    const parsed = parseCommand(['echo'], tree, context);
    assert(parsed.type === 'command', 'command not parsed');

    const result = await parsed.run(context);
    assert(result.type === 'success', 'command failed');
    assert.equal(result.output, '@output');
  });

  it('merges flags and passes each handler only its subset', async () => {
    const seen = {
      command: {} as FlagValues,
      logging: {} as FlagValues
    };

    const tree = applyMiddleware(
      [
        middleware('logging', {
          flags: { verbose: { description, type: 'boolean' } },
          handler: async (next, flags) => {
            seen.logging = flags;
            return next();
          }
        })
      ],
      C.tree({
        echo: C(description, {
          message: { description, type: 'string' }
        }, async flags => {
          seen.command = flags;
        })
      })
    );

    const parsed = parseCommand(
      ['echo', '--message', 'hi', '--verbose'],
      tree,
      context
    );

    assert(parsed.type === 'command', 'command not parsed');
    await parsed.run(context);

    assert.deepEqual(seen.logging, { verbose: true });
    assert.deepEqual(seen.command, { message: 'hi' });
    assert.isUndefined(seen.command.verbose);
  });

  it('propagates operational errors thrown by middleware', async () => {
    let ran = false;

    const tree = applyMiddleware(
      [
        middleware('guard', {
          handler: async () => {
            throw new OperationalError('@blocked');
          }
        })
      ],
      C.tree({
        deploy: C(description, async () => {
          ran = true;
        })
      })
    );

    const parsed = parseCommand(['deploy'], tree, context);
    assert(parsed.type === 'command', 'command not parsed');

    const result = await parsed.run(context);
    assert(result.type === 'failure', 'command succeeded');

    assert.instanceOf(result.error, OperationalError);
    assert.equal(result.error.message, '@blocked');
    assert.isFalse(ran);
  });

  it('propagates operational errors thrown by the command through middleware', async () => {
    const tree = applyMiddleware(
      [
        middleware('logging', {
          handler: async next => next()
        })
      ],
      C.tree({
        deploy: C(description, async () => {
          throw new OperationalError('@failed');
        })
      })
    );

    const parsed = parseCommand(['deploy'], tree, context);
    assert(parsed.type === 'command', 'command not parsed');

    const result = await parsed.run(context);
    assert(result.type === 'failure', 'command succeeded');

    assert.instanceOf(result.error, OperationalError);
    assert.equal(result.error.message, '@failed');
  });

  it('throws when middleware exits without continuing the chain', async () => {
    const tree = applyMiddleware(
      [
        middleware('broken', {
          handler: async () => {}
        })
      ],
      C.tree({
        deploy: C(description, handler)
      })
    );

    const parsed = parseCommand(['deploy'], tree, context);
    assert(parsed.type === 'command', 'command not parsed');

    const result = await parsed.run(context);
    assert(result.type === 'failure', 'command succeeded');
    assert.match(result.error.message, /did not continue the chain/);
  });
});
