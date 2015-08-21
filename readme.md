build project

 ./gradlew  build

 run embedded web service:

 ./gradlew jettyRun

 or (in IDE)

 run JavaApplication
 com.kii.extension.portal.test.JettyServiceLoader


 build war:

 ./gradlew war

 general api-wrap-service-1.0-SNAPSHOT.war at ./build/libs


 after start  embedded web service.

 localhost:8080/api-wrap-service/admin.html

 admin config page

 default admin name/pwd:
 admin/123456

 http://localhost:8080/api-wrap-service/api
 kii-proxy-address

 in proxy-kii

 app-id:app's alias name
 app-key:any string(for example:foo)

 authorizate:admin's token,
 from /oauth2/token,login using admin/pwd

 needn't change other setting

 notice:
 shouldn't login proxy-kii using kii user's account
 always using admin token.

 more detail info:
https://docs.google.com/document/d/1jf9ZAxQ3w6AxcS2LTU0wZUX5YAU0Z2k7-5oRyP3GEaI/
(in update)


future：
add power-user manager logic
