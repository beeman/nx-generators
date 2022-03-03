rm -rf tmp/source
rm -rf tools/generators
mkdir -p tmp/source tools/generators
cd tmp/source || exit
echo "📦  Downloading..."
wget -q https://github.com/beeman/nx-generators/archive/refs/heads/main.zip
echo "🎁  Unpacking..."
unzip main.zip 1>/dev/null
cd ../.. || exit
echo "📼  Copying..."
cp -r tmp/source/nx-generators-main/tools/generators/* tools/generators/
rm -rf tmp/source

echo "📢  Install: yarn add -D @nrwl/nest @nrwl/next ts-morph"
