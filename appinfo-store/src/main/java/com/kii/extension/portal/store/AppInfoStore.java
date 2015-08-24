package com.kii.extension.portal.store;

import javax.annotation.PostConstruct;
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.security.GeneralSecurityException;
import java.security.Key;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.DigestUtils;
import org.springframework.util.FileCopyUtils;

import com.kii.extension.sdk.entity.AppInfo;

@Component
public class AppInfoStore {


	private  static final String LOCATION = "classpath:com/kii/extension/portal/store/certPwd.properties";



	private static final String fileName="secret.app.data";


	private File  appInfoLocation=new File(fileName);

	private String appInfoPath;

	@Value("${appInfo.data.path}")
	public void setAppInfoLocation(String path){

		this.appInfoPath=path;
	}


	private AppInfoCol appInfos=new AppInfoCol();


	@Autowired
	private ResourceLoader loader;


	private String defaultCertPwd="ThisIsTheDefaultPwd";




	@PostConstruct
	public void init() throws IOException {

		appInfoLocation=new File(System.getProperty("user.dir"),appInfoPath);

		if(appInfoLocation.exists()){

			Cipher cipher=getCipher(Cipher.DECRYPT_MODE);
			try {

				byte[] fileCtx = FileCopyUtils.copyToByteArray(appInfoLocation);

				byte[] result = cipher.doFinal(fileCtx);

				try (ObjectInputStream objInput = new ObjectInputStream(new ByteArrayInputStream(result))) {

					appInfos = (AppInfoCol) objInput.readObject();

				} catch (IOException | ClassNotFoundException e) {
					e.printStackTrace();
					throw new AppStoreException(e,"read app info error");
				}
			}catch(IOException|GeneralSecurityException e){
				throw new AppStoreException(e,"operate pwd error");
			}
		}else{
			appInfoLocation.getParentFile().mkdirs();
			appInfoLocation.createNewFile();

			setAdminPwd("admin","123456");
		}



	}

	private String getPwdInProperties()  {

		String pwd = System.getProperty("portal.wrap.certPwd");

		if(pwd!=null){
			return pwd;
		}

		Resource resource=loader.getResource(LOCATION);

		if(resource.exists()){

			Properties prop=new Properties();
			try {
				prop.load(resource.getInputStream());
			} catch (IOException e) {
				e.printStackTrace();
				return defaultCertPwd;
			}

			return prop.getProperty("portal.wrap.certPwd",defaultCertPwd);

		}else{
			return defaultCertPwd;
		}
	}


	public String getAdminName() {
		return appInfos.getAdminName();
	}

	public synchronized void removeAppInfo(String alias) {

		appInfos.getAppInfoMap().remove(alias);

	}

	public List<Map<String,String>>  getAppInfoList(){


		List<String[]>  arrays=appInfos.getAppInfoMap().entrySet().stream()
				.map(entry -> new String[]{entry.getKey(), entry.getValue().getAppID()})
				.collect(Collectors.toCollection(ArrayList<String[]>::new));

		List<Map<String,String>> list=new ArrayList<>();
		for(String[] a:arrays){
			Map<String,String> map=new HashMap<>();

			map.put("appAlias",a[0]);
			map.put("appID",a[1]);
			list.add(map);
		}
		return list;
	}

	public synchronized  void setAdminPwd(String name,String pwd){

		appInfos.setAdminName(name);

		String encodePwd = getEncodePwd(name, pwd);

		appInfos.setAdminPassword(encodePwd);

		saveAppInfos();

	}

	public synchronized void setAppInfo(AppInfo appInfo){
		appInfos.setDefaultInfo(appInfo);

		saveAppInfos();

	}

	public synchronized void addAppInfo(String alias,AppInfo appInfo){

		appInfos.addAppInfo(alias, appInfo);

		saveAppInfos();
	}

	private void saveAppInfos() {

		byte[] bytes = getByteArrayOutputStream();

		Cipher cipher=getCipher(Cipher.ENCRYPT_MODE);

		try(FileOutputStream objInput=new FileOutputStream(appInfoLocation)){

			byte[] result=cipher.doFinal(bytes);

			objInput.write(result);

		} catch (GeneralSecurityException e) {
			throw new AppStoreException(e,"secret the app info fail");
		} catch (IOException e) {
			throw new AppStoreException(e,"save app info fail");
		}
	}

	private byte[] getByteArrayOutputStream()  {

		try(ByteArrayOutputStream bytes=new ByteArrayOutputStream();
			ObjectOutputStream stream = new ObjectOutputStream(bytes)) {
			stream.writeObject(appInfos);
			return bytes.toByteArray();
		}catch(IOException e){
			throw new AppStoreException(e,"write to app store error");
		}
	}


	private Cipher getCipher(int mode){
		String certPwd=getPwdInProperties();

		try {
			Key key = createSecretKey(certPwd);

			Cipher cipher = Cipher.getInstance("AES");

			cipher.init(mode, key);

			return cipher;
		}catch (GeneralSecurityException e) {
			throw new AppStoreException(e,"security error");
		}
	}

	private  Key createSecretKey(String accessPwd)  {

			String serect=accessPwd+"$"+accessPwd;

			byte[] hash=DigestUtils.md5Digest(serect.getBytes());

			byte[] random=new byte[16];
			System.arraycopy(hash, 0, random, 0, random.length);

			return new SecretKeySpec(random, "AES");

	}

	public AppInfo getAppInfo(String alias){

		AppInfo info= appInfos.getAppInfoByAlias(alias);
		if(info==null){
			return appInfos.getDefaultInfo();
		}else{
			return info;
		}

	}


	public AppInfo getDefaultAppInfo() {
		return appInfos.getDefaultInfo();
	}

	public boolean verifyUser(String user, String pwd) {

		String encodePwd = getEncodePwd(user, pwd);

		return appInfos.getAdminName().equals(user)&&appInfos.getAdminPassword().equals(encodePwd);

	}

	private String getEncodePwd(String user, String pwd) {
		String md5Source=user+"_"+pwd;
		return DigestUtils.md5DigestAsHex(md5Source.getBytes());
	}

}
