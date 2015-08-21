package com.kii.extension.portal.store;


import static junit.framework.TestCase.assertEquals;
import static org.junit.Assert.assertTrue;

import java.io.File;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import com.kii.extension.sdk.entity.AppInfo;
import com.kii.extension.sdk.entity.SiteType;

@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations={
		"classpath:com/kii/extension/portal/store/testContext.xml"})
public class TestAppStore {


	@Autowired
	private AppInfoStore  store;


	@Test
	public void verifyPwd(){

		assertTrue(store.verifyUser("admin", "123456"));


		AppInfo info=store.getDefaultAppInfo();

		assertEquals("06e806e2",info.getAppID());

	}


	@After
	public void clear(){
		File file=new File("./yankon.app.data");
		file.delete();
	}

	@Before
	public void initData(){
		String appID="06e806e2";
		String appKey="31afdcdfd72ade025559176a40a20875";

		String client="9a08dd2cf74ef414e6a5ea8033e4a0a4";
		String secret="a82f1e144c111e11e4a9d62e93ef8c2a301e3efd6b6b1862ad4dac0a052a2d9e";

		AppInfo info=new AppInfo();
		info.setSite(SiteType.JP);
		info.setClientSecret(secret);
		info.setClientID(client);
		info.setAppKey(appKey);
		info.setAppID(appID);

		store.setAppInfo(info);

		store.setAdminPwd("admin","123456");



	}
}
