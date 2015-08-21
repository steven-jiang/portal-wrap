package com.kii.extension.portal.test;

import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.webapp.WebAppContext;

public class JettyServiceLoader {

	public static void main(String[] argv){


		Server server = new Server(8080);

		WebAppContext context = new WebAppContext();

		context.setContextPath("/web-portal");
		String path="./web-portal/src/main/webapp";
		context.setDescriptor(path+"/WEB-INF/web.xml");
		context.setResourceBase(path);
		context.setParentLoaderPriority(true);

		server.setHandler(context);


		try {
			server.start();

			server.join();

		} catch (Exception e) {
			e.printStackTrace();
		}


	}
}
