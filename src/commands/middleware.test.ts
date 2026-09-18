import { assert, describe, it } from 'vitest';

import { OperationalError } from '../errors.ts';
import C from '../factory.ts';
import { createTestContext, description, handler, T } from '../tests.ts';
import type { FlagValues, MiddlewareHandler } from './middleware.ts';
import { applyMiddleware, buildMiddleware } from './middleware.ts';
import { parseCommand } from './parsing.ts';

const context = createTestContext();
const logging = 'Log command output';

describe('buildMiddleware', () => {
  it('can define middleware with only a handler', () => {
    const command = buildMiddleware(logging, async next => next());

    assert.equal(command.description, logging);
    assert.isUndefined(command.flags);
    assert.isFunction(command.handler);
  });

  it('can define middleware with flags', () => {
    const command = buildMiddleware(
      logging,
      { verbose: { description, type: 'boolean' } },
      async (next, { flags }) => {
        assert.isDefined(flags.verbose);
        return next();
      }
    );

    assert.equal(command.description, logging);
    assert.isDefined(command.flags?.verbose);
  });

  it('provides handlers with narrow type information for flags', () => {
    buildMiddleware(
      logging,
      {
        boolean: { description, type: 'boolean' },
        number: { description, type: 'number' },
        string: { description, required: true, type: 'string' }
      },
      async (next, { flags }) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              boolean: boolean;
              number?: number;
              string: string;
            }
          >
        >(true);

        await next();
      }
    );
  });

  it('rejects an invalid middleware request', () => {
    assert.throws(
      () =>
        buildMiddleware(
          logging,
          { verbose: { description, type: 'boolean' } },
          undefined as unknown as MiddlewareHandler
        ),
      'Invalid middleware request'
    );
  });
});

describe('applyMiddleware', () => {
  it('returns a handler immediately when given a command handler', async () => {
    let ran = false;

    const wrapped = applyMiddleware([
      buildMiddleware(logging, async next => {
        ran = true;
        await next();
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
        buildMiddleware(
          logging,
          { verbose: { description, type: 'boolean' } },
          async next => next()
        )
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
            buildMiddleware(
              logging,
              { verbose: { description, type: 'boolean' } },
              async next => next()
            )
          ],
          C.tree({
            echo: C(description, {
              verbose: { description, type: 'boolean' }
            }, handler)
          })
        ),
      `Failed to apply middleware: ${logging}\nThe --verbose flag is already present on command: echo`
    );
  });

  it('throws when middleware flags conflict with each other', () => {
    assert.throws(
      () =>
        applyMiddleware(
          [
            buildMiddleware(
              logging,
              { verbose: { description, type: 'boolean' } },
              async next => next()
            ),
            buildMiddleware(
              'Time command execution',
              { verbose: { description, type: 'boolean' } },
              async next => next()
            )
          ],
          C.tree({
            deploy: C(description, handler)
          })
        ),
      'on command: deploy'
    );
  });

  it('applies middleware to handlers within a group', async () => {
    let ran = false;

    const group = applyMiddleware(
      [
        buildMiddleware(logging, async next => {
          ran = true;
          await next();
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
      buildMiddleware('Outer', async next => {
        order.push('outer:before');
        await next();
        order.push('outer:after');
      }),
      buildMiddleware('Inner', async next => {
        order.push('inner:before');
        await next();
        order.push('inner:after');
      })
    ];

    const tree = applyMiddleware(
      stack,
      C.tree({
        command: undefined,
        deploy: C(description, async () => {
          order.push('deploy');
          return '@deploy';
        }),
        db: C.group(description, {
          migrate: C(description, async () => {
            order.push('migrate');
          })
        })
      })
    );

    assert.isUndefined(tree.command);

    const deploy = parseCommand(['deploy'], tree, context);
    assert(deploy.type === 'command', 'deploy not parsed');

    const deployResult = await deploy.run(context);
    assert(deployResult.type === 'success', 'deploy failed');
    assert.equal(deployResult.output, '@deploy');

    const migrate = parseCommand(['db', 'migrate'], tree, context);
    assert(migrate.type === 'command', 'migrate not parsed');

    const migrateResult = await migrate.run(context);
    assert(migrateResult.type === 'success', 'migrate failed');
    assert.isUndefined(migrateResult.output);

    assert.deepEqual(order, [
      'outer:before',
      'inner:before',
      'deploy',
      'inner:after',
      'outer:after',
      'outer:before',
      'inner:before',
      'migrate',
      'inner:after',
      'outer:after'
    ]);
  });

  it('returns string output from the wrapped command handler', async () => {
    const tree = applyMiddleware(
      [
        buildMiddleware(logging, async next => next())
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

  it('returns string output through nested middleware wrappers', async () => {
    const tree = applyMiddleware(
      [buildMiddleware('Outer', async next => next())],
      C.tree({
        test: applyMiddleware(
          [buildMiddleware('Inner', async next => next())],
          C.group(description, {
            echo: C(description, async () => '@output')
          })
        )
      })
    );

    const parsed = parseCommand(['test', 'echo'], tree, context);
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
        buildMiddleware(
          logging,
          { verbose: { description, type: 'boolean' } },
          async (next, { flags }) => {
            seen.logging = flags;
            await next();
          }
        )
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
        buildMiddleware('Block command execution', async () => {
          throw new OperationalError('@blocked');
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
        buildMiddleware(logging, async next => next())
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

  it('passes the command path to middleware handlers', async () => {
    const paths: string[][] = [];

    const tree = applyMiddleware(
      [
        buildMiddleware(logging, async (next, { command }) => {
          paths.push(command);
          await next();
        })
      ],
      C.tree({
        deploy: C(description, handler),
        db: C.group(description, {
          migrate: C(description, handler)
        })
      })
    );

    const deploy = parseCommand(['deploy'], tree, context);
    assert(deploy.type === 'command', 'deploy not parsed');
    await deploy.run(context);

    const migrate = parseCommand(['db', 'migrate'], tree, context);
    assert(migrate.type === 'command', 'migrate not parsed');
    await migrate.run(context);

    assert.deepEqual(paths, [['deploy'], ['db', 'migrate']]);
  });

  it('passes the full command path when middleware is applied at multiple levels', async () => {
    let inner: string[] = [];
    let outer: string[] = [];

    const tree = applyMiddleware(
      [buildMiddleware('Outer', async (next, { command }) => {
        outer = command;
        await next();
      })],
      C.tree({
        test: applyMiddleware(
          [buildMiddleware('Inner', async (next, { command }) => {
            inner = command;
            await next();
          })],
          C.group(description, {
            unit: C(description, handler)
          })
        )
      })
    );

    const parsed = parseCommand(['test', 'unit'], tree, context);
    assert(parsed.type === 'command', 'command not parsed');

    await parsed.run(context);

    assert.deepEqual(inner, ['test', 'unit']);
    assert.deepEqual(inner, outer);
  });

  it('throws when middleware exits without continuing the chain', async () => {
    const tree = applyMiddleware(
      [
        buildMiddleware('Broken middleware', async () => {})
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
