/**
 * This leverages Koa to create and run the http server.
 * A Fluxible context is created and executes the navigateAction
 * based on the URL. Once completed, the store state is dehydrated
 * and the application is rendered via React.
 */

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import logger from 'koa-logger';
import path from 'path';
import serialize from 'serialize-javascript';
import navigateAction from './actions/navigate';
import React from 'react';
import ReactDOM from 'react-dom/server';
import HtmlComponent from './components/Html';
import FluxibleComponent from 'fluxible-addons-react/FluxibleComponent';
import { match, RouterContext } from 'react-router';
import app from './app';

const server = new Koa();

server.use(serve(path.join(__dirname, '/public')));
server.use(bodyParser());
server.use(logger());

server.use((ctx, next) => {
    return new Promise((resolve, reject) => {
        match({routes: app.getComponent(), location: ctx.url}, (error, redirectLocation, renderProps) => {
            if (error) {
                reject(error);
            } else if (redirectLocation) {
                ctx.redirect(redirectLocation.pathname + redirectLocation.search);
            } else if (renderProps) {
                const context = app.createContext();
                context.executeAction(navigateAction, {path: ctx.url}, () => {
                    const exposed = `window.App=${serialize(app.dehydrate(context))};`;
                    const markup = ReactDOM.renderToString(
                        <FluxibleComponent context={context.getComponentContext()}>
                            <RouterContext {...renderProps} />
                        </FluxibleComponent>
                    );
                    const htmlElement = React.createElement(HtmlComponent, {
                        clientFile: process.env.NODE_ENV === 'production' ? 'main.min.js' : 'main.js',
                        context: context.getComponentContext(),
                        state: exposed,
                        markup: markup
                    });
                    const html = ReactDOM.renderToStaticMarkup(htmlElement);

                    resolve(html);
                });
            } else {
              next();
            }
        });
    }).then(result => {
        ctx.response.body = '<!DOCTYPE html>' + result;
        ctx.response.type = 'html';
    }).catch(error => {
        ctx.throw(error.message, 500);
    });
});

const port = process.env.PORT || 3000;
server.listen(port);
console.log(`Application listening on port ${port}`);

export default server;
