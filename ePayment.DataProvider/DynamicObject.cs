using MongoDB.Bson;
using System;
using System.Collections.Generic;
using System.Dynamic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace ePayment.DataProvider
{
    public class DynamicObj : DynamicObject
    {
        Dictionary<string, object> dictionary = new Dictionary<string, object>();

        public override bool TryGetMember(GetMemberBinder binder, out object result)
        {
            string name = binder.Name;
            if (dictionary.ContainsKey(name))
            {
                return dictionary.TryGetValue(name, out result);
            }
            else
            {
                result = null;
                return true;
            }
        }

        public override bool TrySetMember(SetMemberBinder binder, object value)
        {
            string name = binder.Name;

            dictionary[name] = value;

            return true;
        }

        public DynamicObj() { }

        public DynamicObj(BsonDocument bsonDocument)
        {
            foreach (BsonElement el in bsonDocument.Elements)
            {
                if (el.Value.IsBsonDocument)
                {
                    dictionary[el.Name] = new DynamicObj(el.Value.AsBsonDocument);
                }
                else if (el.Value.IsBsonArray)
                {
                    List<DynamicObj> list = new List<DynamicObj>();
                    foreach (BsonValue e in el.Value.AsBsonArray)
                        list.Add(new DynamicObj(e.AsBsonDocument));
                    dictionary[el.Name] = list.ToArray();
                }
                else
                {
                    dictionary[el.Name] = BsonTypeMapper.MapToDotNetValue(el.Value);
                }
            }
        }

        public BsonDocument ToBsonDocument()
        {
            BsonDocument doc = new BsonDocument();
            foreach (string k in dictionary.Keys)
            {
                if (dictionary[k] is DynamicObj)
                {
                    doc.Add(k, ((DynamicObj)dictionary[k]).ToBsonDocument());
                }
                else if (dictionary[k] is DynamicObj[])
                {
                    List<BsonDocument> listB = new List<BsonDocument>();
                    foreach (DynamicObj o in (DynamicObj[])dictionary[k])
                    {
                        listB.Add(o.ToBsonDocument());
                    }
                    doc.Add(k, BsonTypeMapper.MapToBsonValue(listB.ToArray(), BsonType.Array));
                }
                else doc.Add(k, BsonTypeMapper.MapToBsonValue(dictionary[k]));
            }
            return doc;
        }
    }
}
