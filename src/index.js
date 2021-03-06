'use strict';

const loaders = require('./loaders');

const GraphQLBookshelf = {
    /**
     * Quick workaround allowing GraphQL to access model attributes directly
     * (to access a bookshelf model attribute (like model.name), we have to use the .get() method)
     *
     * @param {object} collection
     * @returns {*}
     */
    exposeAttributes(collection) {
        function exposeModelAttributes(item) {
            // Make sure that relations are excluded
            return Object.assign(item, item.serialize({ shallow: true }));
        }
        if (collection) {
            if (collection.hasOwnProperty('length')) {
                return collection.map((item) => { return exposeModelAttributes(item); });
            }
            return exposeModelAttributes(collection);
        }
        return collection;
    },

    /**
     *
     * @returns {function}
     */
    getLoaders() {
        return loaders;
    },

    /**
     *
     * @param {function} Model
     * @returns {function}
     */
    resolverFactory(Model) {
        return function resolver(modelInstance, args, context, info, extra) {
            const isAssociation = (typeof Model.prototype[info.fieldName] === 'function');
            if (!(modelInstance instanceof Model)) {
              modelInstance = new Model();
            }
            const model = isAssociation ? modelInstance.related(info.fieldName) : modelInstance;
            for (const key in args) {
                model.where(`${model.tableName}.${key}`, args[key]);
            }
            if (extra) {
                for (const key in extra) {
                    model[key](...extra[key]);
                    delete extra.key;
                }
            }
            if (isAssociation) {
                context && context.loaders && context.loaders(model);
                return model.fetch().then((c) => { return GraphQLBookshelf.exposeAttributes(c); });
            }
            const fn = (info.returnType.constructor.name === 'GraphQLList') ? 'fetchAll' : 'fetch';
            return model[fn]().then((c) => { return GraphQLBookshelf.exposeAttributes(c); });
        };
    },

};

module.exports = GraphQLBookshelf;
