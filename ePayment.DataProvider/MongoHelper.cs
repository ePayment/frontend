using MongoDB.Driver;
using MongoDB.Driver.Builders;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ePayment.DataProvider
{
    public class MongoHelper
    {
        string _connection_string;
        string _database_name;
        public dynamic Get(string objectName, dynamic query)
        {
            throw new NotImplementedException();
        }
        public MongoHelper() { }
        public MongoHelper(string ConnectionString, string Database)
        {
            this._connection_string = ConnectionString;
            this._database_name = Database;
        }

        private MongoDatabase _database;

        MongoDatabase Database
        {
            get
            {
                try
                {
                    if (_database == null)
                    {
                        MongoClient client = new MongoClient(_connection_string);
                        MongoServer server = client.GetServer();
                        server.Connect();
                        _database = server.GetDatabase(_database_name);
                    }
                    return _database;
                }
                catch
                {
                    return null;
                }
            }
        }


        public long GetNextSquence(string sequenceName)
        {
            try
            {
                MongoCollection sequenceCollection = Database.GetCollection("sequences");
                FindAndModifyArgs args = new FindAndModifyArgs();
                args.Query = Query.EQ("_id", sequenceName);
                args.Update = Update.Inc("seq", 1);
                FindAndModifyResult result = sequenceCollection.FindAndModify(args);
                return result.ModifiedDocument.GetElement("seq").Value.ToInt64();
            }
            catch
            {
                dynamic bs = new JObject();
                bs._id = sequenceName;
                bs.seq = 2;
                Save("sequences", bs);
                return 1;
            }
        }


        public long Save(string object_name, dynamic object_value)
        {
            try
            {
                DateTime _now = DateTime.Now;
                if (object_value.created_time == null)
                {
                    object_value.created_time = genTimeKeyJson(_now);
                }
                object_value.last_updated_time = genTimeKeyJson(_now);
                BsonDocument obj = MongoDB.Bson.Serialization.BsonSerializer.Deserialize<BsonDocument>(object_value.ToString());

                Database.GetCollection(object_name).Save(obj);
                return 1;
            }
            catch (Exception ex)
            {
                return -1;
            }
        }

        private dynamic genTimeKeyJson(DateTime time)
        {
            long _year = long.Parse(time.ToString("yyyy"));
            long _month = long.Parse(time.ToString("yyyyMM"));
            long _date = long.Parse(time.ToString("yyyyMMdd"));
            long _time = long.Parse(time.ToString("HHmmss"));

            dynamic timeKey = new JObject();
            timeKey.year = _year;
            timeKey.month = _month;
            timeKey.date = _date;
            timeKey.time = _time;
            return timeKey;
        }
    }
}
