using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;


namespace ePayment.CommonLib
{
    public static class GeneratePassword
    {
        private static readonly char[] UpperCase = { 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z' };
        private static readonly char[] LowerCase = { 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z' };
        private static readonly char[] Digits = { '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' };
        private static char[] _all = null;

       private static char[] All
        {
            get
            {
                if (_all == null)
                {
                    _all = new char[UpperCase.Length + LowerCase.Length + Digits.Length];
                    Array.Copy(UpperCase, 0, _all, 0, UpperCase.Length);
                    Array.Copy(LowerCase, 0, _all, LowerCase.Length, LowerCase.Length);
                    Array.Copy(Digits, 0, _all, LowerCase.Length + UpperCase.Length, Digits.Length);
                }
                return _all;
            }
        }

        public static string Generate()
        {
            var passwordChars = new List<char>();
            var rand = new Random();

            passwordChars.Add(UpperCase[rand.Next(UpperCase.Length)]);	// at least 1 uppercase letter
            passwordChars.Add(LowerCase[rand.Next(LowerCase.Length)]);	// at least 1 lowercase letter
            passwordChars.Add(Digits[rand.Next(Digits.Length)]);		// at least 1 digit

            // fill up the password with random chars from the complete collection
            for (int i = 0; i < 5; i++) // 3 required chars + 5 random = 8 total
            {
                passwordChars.Add(All[rand.Next(All.Length)]);
            }

            // randomize the order of the chars in the collection
            passwordChars = passwordChars.OrderBy(x => rand.Next(10000)).ToList();
            // create a string based on it
            var password = new string(passwordChars.ToArray());
            // and return it as a new password
            return password;
        }
    }
}
