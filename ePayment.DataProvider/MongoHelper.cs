using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.Builders;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace ePayment.DataProvider
{
    public class MongoHelper
    {
        public static string MongoServer, MongoDatabase;
        private static MongoDatabase _database;
        static MongoDatabase Database
        {
            get
            {
                if (_database == null)
                {
                    MongoClient client = new MongoClient(MongoServer);
                    MongoServer server = client.GetServer();
                    server.Connect();
                    _database = server.GetDatabase(MongoDatabase);
                }
                return _database;
            }
        }
        private static BsonDocument GetDocument(string collectionName, IMongoQuery query)
        {
            var doc = Database.GetCollection(collectionName).Find(query).FirstOrDefault();
            return doc;
        }

        public static bool Delete(string objectName, dynamic _id)
        {
            WriteConcernResult result = Database.GetCollection(objectName).Remove(
                Query.EQ("_id", _id));
            return result.Ok;
        }

        public static DynamicObj Get(string objectName, IMongoQuery query)
        {
            BsonDocument doc = GetDocument(objectName, query);
            if (doc == null)
                return null;
            return new DynamicObj(doc);
        }
        private static List<BsonDocument> ListDocument(string collectionName, IMongoQuery query)
        {
            var doc = Database.GetCollection(collectionName).Find(query).ToList();
            return doc;
        }

        private static List<BsonDocument> ListDocument(string collectionName, IMongoQuery query, IMongoSortBy sort)
        {
            var doc = Database.GetCollection(collectionName).Find(query).SetSortOrder(sort).ToList();
            return doc;
        }

        public static DynamicObj[] List(string objectName, IMongoQuery query)
        {
            List<BsonDocument> list = ListDocument(objectName, query);
            List<DynamicObj> lstObj = new List<DynamicObj>();
            foreach (BsonDocument doc in list)
            {
                lstObj.Add(new DynamicObj(doc));
            }
            return lstObj.ToArray();
        }

        public static DynamicObj[] List(string objectName, IMongoQuery query, IMongoSortBy sort)
        {
            List<BsonDocument> list = ListDocument(objectName, query, sort);
            List<DynamicObj> lstObj = new List<DynamicObj>();
            foreach (BsonDocument doc in list)
            {
                lstObj.Add(new DynamicObj(doc));
            }
            return lstObj.ToArray();
        }

        private static bool SaveDocument(string collectionName, BsonDocument document)
        {
            WriteConcernResult result = Database.GetCollection(collectionName).Save(document);
            return result.Ok;
        }

        public static bool Save(string objectName, DynamicObj obj)
        {
            dynamic dyna = obj;
            dyna.system_last_updated_time = DateTime.Now;
            string notes = DateTime.Now.ToString() + " - UPDATE BY SYSTEM";
            notes = notes + Environment.NewLine;
            notes = notes + dyna.system_historical_notes;
            dyna.system_historical_notes = notes;
            return SaveDocument(objectName, dyna.ToBsonDocument());
        }

        private static bool InsertDocument(string collectionName, BsonDocument document)
        {
            WriteConcernResult result = Database.GetCollection(collectionName).Insert(document);
            return result.Ok;
        }

        public static bool Insert(string objectName, DynamicObj obj)
        {
            BsonDocument bObj = obj.ToBsonDocument();
            return InsertDocument(objectName,
                bObj);
        }
        public static bool UpdateObject(string objectName, IMongoQuery query, IMongoUpdate update)
        {
            dynamic dynaobject = Get(objectName, query);
            string system_notes = DateTime.Now.ToUniversalTime().ToString() + " - UPDATE BY SYSTEM";
            system_notes = system_notes + Environment.NewLine;
            system_notes = system_notes + dynaobject.system_historical_notes;
            UpdateBuilder updateinfosystem = Update.Set("system_last_updated_time", DateTime.Now.ToUniversalTime())
                .Set("system_last_updated_by", " - SYSTEM - ")
                .Set("system_historical_notes", system_notes);
            Database.GetCollection(objectName).Update(query, updateinfosystem);
            WriteConcernResult result = Database.GetCollection(objectName).Update(query, update);
            return result.Ok;
        }

        public static long GetNextSquence(string SequenceName)
        {
            try
            {
                MongoCollection sequenceCollection = Database.GetCollection("counters");
                long count = Count("counters", Query.EQ("_id", SequenceName));
                if (count <= 0)
                {
                    dynamic bs = new DynamicObj();
                    bs._id = SequenceName;
                    bs.seq = 1;
                    Insert("counters", bs);
                    return 1;
                    //FindAndModifyResult resultnew = sequenceCollection.FindAndModify(
                    //    Query.EQ("_id", SequenceName),
                    //    null,
                    //    MongoDB.Driver.Builders.Update.Inc("seq", 1));
                    //resultnew.ModifiedDocument.GetElement("seq").Value.ToInt64();
                }
                else
                {
                    FindAndModifyResult result = sequenceCollection.FindAndModify(
                        Query.EQ("_id", SequenceName),
                        null,
                        MongoDB.Driver.Builders.Update.Inc("seq", 1));
                    return result.ModifiedDocument.GetElement("seq").Value.ToInt64();
                }
            }
            catch (Exception ex)
            {

            }
            return -1;
        }
        private static void CreateDocument(string collectionName, BsonDocument document, IMongoQuery query)
        {
            var old = GetDocument(collectionName, query);
            if (old == null)
                InsertDocument(collectionName, document);
        }

        public static void Create(string objectName, DynamicObj obj, IMongoQuery query)
        {
            CreateDocument(objectName, obj.ToBsonDocument(), query);
        }
        public static long Count(string objectName, IMongoQuery query)
        {
            return Database.GetCollection(objectName).Find(query).Count();
        }
    }
}
