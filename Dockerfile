#should notice that there IS a differenct between ADD and -v mount;
#ADD is for adding files/directories from host to docker, so changes made to docker won't be reflected on host
#mount is interactive, changes made to docker will be adapted to host as well.
#hence mount option is necessary to make sure generated zip file on docker is available on host
#https://naruport.com/blog/2019/8/29/docker-add-and-mount/


FROM lambci/lambda:build-nodejs12.x

WORKDIR /var/task

ADD ./index.js ./package.json ./

#./node_modules ./

#this doesn't wodk
#RUN npm install
#RUN touch a

#CMD should be in 1 statement
#remove node_modules directory first, otherwise it will never be replaced new one
CMD rm -r node_modules && npm install && zip -r deploy_package.zip .

#how to mount on layer?