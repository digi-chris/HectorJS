using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace HectorWeb
{
    public class Content
    {
        Dictionary<string, string> _pages;
        Dictionary<string, byte[]> _files;
        Dictionary<string, Tuple<byte[], string>> _webCache;

        public Content()
        {
            _pages = new Dictionary<string, string>();
            _files = new Dictionary<string, byte[]>();
            _webCache = new Dictionary<string, Tuple<byte[], string>>();

            Assembly a = Assembly.GetExecutingAssembly();
            foreach (string name in a.GetManifestResourceNames())
            {
                if (SimpleWebServer.MIME.GetMimeType(Path.GetExtension(name)).Contains("text"))
                {
                    using (Stream stream = a.GetManifestResourceStream(name))
                    using (StreamReader reader = new StreamReader(stream))
                    {
                        string pageContent = reader.ReadToEnd();
                        _pages.Add(name, pageContent);
                    }
                }
                else
                {
                    using (Stream stream = a.GetManifestResourceStream(name))
                    {
                        byte[] streamBytes = new byte[stream.Length];
                        stream.Read(streamBytes, 0, streamBytes.Length);
                        _files.Add(name, streamBytes);
                    }
                }
            }
        }

        public bool ContentExists(string path)
        {
            string oPath = path;
            path = "HectorWeb" + path.Replace("/", ".");
            if(_files.ContainsKey(path))
            {
                return true;
            }
            else if(_pages.ContainsKey(path))
            {
                return true;
            }
            else if(_webCache.ContainsKey(oPath))
            {
                return true;
            }

            HttpWebRequest req = (HttpWebRequest)HttpWebRequest.Create("http://store.hector.direct" + oPath);
            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
            {
                // TODO: There is something weird with the ContentExists method and paths that don't exist,
                // it seems like it never returns (never gets to this point), but the calling function does
                // send a blank page to the client somehow (terminates the connection).
                if (resp.StatusCode == HttpStatusCode.OK)
                {
                    try
                    {
                        Stream rStream = resp.GetResponseStream();
                        byte[] buffer = new byte[16384];
                        int bytesRead;
                        MemoryStream mStream = new MemoryStream();
                        while ((bytesRead = rStream.Read(buffer, 0, buffer.Length)) > 0)
                        {
                            mStream.Write(buffer, 0, bytesRead);
                        }
                        byte[] responseData = mStream.ToArray();

                        _webCache.Add(oPath, Tuple.Create(responseData, resp.ContentType));
                        rStream.Dispose();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine(ex.ToString());
                        return false;
                    }
                    return true;
                }
                return false;
            }
        }

        public Tuple<byte[], string> GetContent(string path)
        {
            string oPath = path;
            if(oPath.Contains("plugins"))
            {
                Console.WriteLine("Huh");
            }
            path = "HectorWeb" + path.Replace("/", ".");
            if (_files.ContainsKey(path))
            {
                return Tuple.Create(_files[path], "");
            }
            else if (_pages.ContainsKey(path))
            {
                string content = GetPage(path);
                if (content != "")
                {
                    return Tuple.Create(System.Text.Encoding.UTF8.GetBytes(content), "");
                }
                else
                {
                    return Tuple.Create(new byte[0], "");
                }
            }
            else if(_webCache.ContainsKey(oPath))
            {
                return _webCache[oPath];
            }

            return Tuple.Create(new byte[0], "");
        }

        public string GetPage(string path)
        {
            //path = "HectorWeb" + path.Replace("/", ".");
            Assembly a = Assembly.GetExecutingAssembly();

            if (_pages.ContainsKey(path))
            {
                string outContent = _pages[path];
                Regex r = new Regex(@"\[#.*\]");
                MatchCollection matches = r.Matches(outContent);

                if (matches.Count > 0)
                {
                    foreach (Match m in matches)
                    {
                        if (m.Value.StartsWith("[#INCLUDE(\""))
                        {
                            string includeFile = m.Value.Replace("[#INCLUDE(\"", "").Replace("\")]", "");
                            outContent = outContent.Replace(m.Value, GetPage("HectorWeb" + includeFile.Replace("/", ".")));
                        }
                    }
                }

                return outContent;
            }
            else
            {
                return "";
            }
        }

        public void SetPage(string path, string pageContent)
        {
            path = "HectorWeb" + path.Replace("/", ".");
            if(_pages.ContainsKey(path))
            {
                _pages[path] = pageContent;
            }
            else
            {
                _pages.Add(path, pageContent);
            }
        }

        public void AppendPage(string path, string pageContent)
        {
            SetPage(path, GetPage(path) + pageContent);
        }
    }
}
